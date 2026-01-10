import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import { app, dialog } from "electron";
import archiver from "archiver";
import unzipper from "unzipper";
import dataApp from "./variables";
import { writeLog } from "./logger";
import { getStorageValue, saveStorageValue } from "./storage";
import type {
  ProgressEvent,
  VaultAuthVerifier,
  VaultFolder,
  VaultItem,
  VaultManifest,
  VaultSettings,
  VaultWrappedMasterKey,
} from "@types";

const VAULT_SCHEMA_VERSION = 1 as const;
const TAG_LENGTH_BYTES = 16 as const;
const NONCE_LENGTH_BYTES = 12 as const;

const getVaultRoot = (): string => path.join(app.getPath("userData"), "vault");

const getVaultPaths = () => {
  const root = getVaultRoot();
  return {
    root,
    manifestPath: path.join(root, "manifest.json"),
    foldersDir: path.join(root, "folders"),
    tempDir: path.join(root, "temp"),
    backupsDir: path.join(root, "backups"),
  };
};

const ensureDir = async (dir: string): Promise<void> => {
  await fs.promises.mkdir(dir, { recursive: true });
};

const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    const text = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const writeJsonFileAtomic = async (filePath: string, value: unknown) => {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tmpPath = `${filePath}.tmp_${Date.now()}`;
  await fs.promises.writeFile(tmpPath, JSON.stringify(value, null, 2), "utf8");
  await fs.promises.rename(tmpPath, filePath);
};

const getDefaultVaultSettings = (): VaultSettings => ({
  authMethod: "password",
  autoLockSeconds: 60,
  failedAttemptsLimit: 5,
  cooldownSeconds: 60,
  integrityCheckOnImport: true,
  integrityCheckOnAccess: true,
  compressionThresholdBytes: 100 * 1024 * 1024,
  autoCompressLargeFiles: true,
  incognitoModeEnabled: false,
  secretModeEnabled: false,
  backupPolicy: {
    allowExport: true,
    allowSameKeyExport: true,
    requireLongPasswordForReencrypt: true,
  },
});

const ensureInitialized = async (): Promise<
  { ok: true } | { ok: false; error: string }
> => {
  try {
    const { root, foldersDir, tempDir, backupsDir, manifestPath } =
      getVaultPaths();

    await Promise.all([
      ensureDir(root),
      ensureDir(foldersDir),
      ensureDir(tempDir),
      ensureDir(backupsDir),
    ]);

    const manifest = await readJsonFile<VaultManifest>(manifestPath);
    if (!manifest) {
      const next: VaultManifest = {
        schemaVersion: VAULT_SCHEMA_VERSION,
        encryptionVersion: 1,
        folders: [],
        masterKeyId: "",
      };
      await writeJsonFileAtomic(manifestPath, next);
    }

    const existingSettings = await getStorageValue("VAULT_SETTINGS");
    if (!existingSettings) {
      await saveStorageValue(
        "VAULT_SETTINGS",
        JSON.stringify(getDefaultVaultSettings())
      );
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const sendProgress = (event: ProgressEvent) => {
  const mainWindow = dataApp.getValue("mainWindow");
  if (!mainWindow || mainWindow.isDestroyed()) return;

  mainWindow.webContents.send("vault-progress", event);
};

type VaultSession = {
  masterKey: Buffer;
  keyId: string;
  expiresAtMs: number;
};

let session: VaultSession | null = null;

const sha256Base64 = (buf: Buffer): string =>
  crypto.createHash("sha256").update(buf).digest("base64");

const scryptDerive = async (
  password: string,
  salt: Buffer,
  keyLen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> => {
  return await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, keyLen, options, (err, derivedKey) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(derivedKey as Buffer);
    });
  });
};

const deriveKeyScrypt = async (
  password: string,
  kdf: VaultWrappedMasterKey["kdf"]
) => {
  if (kdf.algorithm !== "scrypt") throw new Error("Unsupported KDF");
  const salt = Buffer.from(kdf.saltBase64, "base64");

  const key = await scryptDerive(password, salt, kdf.keyLen, {
    N: kdf.N,
    r: kdf.r,
    p: kdf.p,
  });

  return key;
};

const unwrapMasterKey = async (
  wrapped: VaultWrappedMasterKey,
  password: string
) => {
  const wrapKey = await deriveKeyScrypt(password, wrapped.kdf);
  const nonce = Buffer.from(wrapped.wrapNonceBase64, "base64");
  const cipher = Buffer.from(wrapped.wrappedKeyBase64, "base64");

  const tag = cipher.subarray(cipher.length - TAG_LENGTH_BYTES);
  const ciphertext = cipher.subarray(0, cipher.length - TAG_LENGTH_BYTES);

  const decipher = crypto.createDecipheriv("aes-256-gcm", wrapKey, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

const wrapMasterKey = async (masterKey: Buffer, password: string) => {
  const salt = crypto.randomBytes(16);
  const kdf = {
    algorithm: "scrypt" as const,
    saltBase64: salt.toString("base64"),
    N: 1 << 15,
    r: 8,
    p: 1,
    keyLen: 32 as const,
  };

  const wrapKey = await scryptDerive(password, salt, 32, {
    N: kdf.N,
    r: kdf.r,
    p: kdf.p,
  });

  const nonce = crypto.randomBytes(NONCE_LENGTH_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", wrapKey, nonce);
  const encrypted = Buffer.concat([cipher.update(masterKey), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    wrappedKeyBase64: Buffer.concat([encrypted, tag]).toString("base64"),
    wrapNonceBase64: nonce.toString("base64"),
    kdf,
  };
};

const loadSettings = async (): Promise<VaultSettings> => {
  const settingsStr = await getStorageValue("VAULT_SETTINGS");
  if (!settingsStr) return getDefaultVaultSettings();

  try {
    return JSON.parse(settingsStr) as VaultSettings;
  } catch {
    return getDefaultVaultSettings();
  }
};

const unlockVault = async (password: string) => {
  await ensureInitialized();

  const settings = await loadSettings();
  const now = Date.now();

  const wrappedStr = await getStorageValue("VAULT_MASTER_KEY_WRAPPED");
  const verifierStr = await getStorageValue("VAULT_AUTH_VERIFIER");

  if (!wrappedStr || !verifierStr) {
    const masterKey = crypto.randomBytes(32);
    const keyId = crypto.randomUUID();

    const wrappedParts = await wrapMasterKey(masterKey, password);

    const wrapped: VaultWrappedMasterKey = {
      schemaVersion: VAULT_SCHEMA_VERSION,
      keyId,
      wrappedKeyBase64: wrappedParts.wrappedKeyBase64,
      wrapNonceBase64: wrappedParts.wrapNonceBase64,
      kdf: wrappedParts.kdf,
    };

    const derived = await deriveKeyScrypt(password, wrapped.kdf);
    const verifier: VaultAuthVerifier = {
      schemaVersion: VAULT_SCHEMA_VERSION,
      method: "password",
      kdf: wrapped.kdf,
      verifierBase64: sha256Base64(
        Buffer.concat([derived, Buffer.from("vault-verifier")])
      ),
    };

    await Promise.all([
      saveStorageValue("VAULT_MASTER_KEY_WRAPPED", JSON.stringify(wrapped)),
      saveStorageValue("VAULT_AUTH_VERIFIER", JSON.stringify(verifier)),
    ]);

    const { manifestPath } = getVaultPaths();
    const manifest = (await readJsonFile<VaultManifest>(manifestPath)) || {
      schemaVersion: VAULT_SCHEMA_VERSION,
      encryptionVersion: 1,
      folders: [],
      masterKeyId: "",
    };

    manifest.masterKeyId = keyId;
    await writeJsonFileAtomic(manifestPath, manifest);

    session = {
      masterKey,
      keyId,
      expiresAtMs: now + settings.autoLockSeconds * 1000,
    };
    return { ok: true } as const;
  }

  let wrapped: VaultWrappedMasterKey;
  let verifier: VaultAuthVerifier;
  try {
    wrapped = JSON.parse(wrappedStr) as VaultWrappedMasterKey;
    verifier = JSON.parse(verifierStr) as VaultAuthVerifier;
  } catch {
    return { ok: false, error: "Invalid vault auth data" } as const;
  }

  try {
    if (verifier.kdf.algorithm !== "scrypt")
      return { ok: false, error: "Unsupported vault KDF" } as const;

    const derived = await deriveKeyScrypt(password, verifier.kdf);
    const computed = sha256Base64(
      Buffer.concat([derived, Buffer.from("vault-verifier")])
    );

    if (computed !== verifier.verifierBase64)
      return { ok: false, error: "Invalid password" } as const;

    const masterKey = await unwrapMasterKey(wrapped, password);

    session = {
      masterKey,
      keyId: wrapped.keyId,
      expiresAtMs: now + settings.autoLockSeconds * 1000,
    };

    return { ok: true } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as const;
  }
};

const isUnlocked = (): boolean => {
  if (!session) return false;
  if (Date.now() >= session.expiresAtMs) {
    session = null;
    return false;
  }
  return true;
};

const requireUnlocked = async () => {
  if (!isUnlocked()) throw new Error("Vault is locked");
  const settings = await loadSettings();
  session = {
    ...session!,
    expiresAtMs: Date.now() + settings.autoLockSeconds * 1000,
  };
  return session!;
};

const getFolderPaths = (folderId: string) => {
  const { foldersDir } = getVaultPaths();
  const folderDir = path.join(foldersDir, folderId);
  return {
    folderDir,
    folderJson: path.join(folderDir, "folder.json"),
    itemsDir: path.join(folderDir, "items"),
  };
};

const listFolders = async (): Promise<VaultFolder[]> => {
  await ensureInitialized();

  const { foldersDir } = getVaultPaths();
  const entries = await fs.promises.readdir(foldersDir, {
    withFileTypes: true,
  });

  const folders = await Promise.all(
    entries
      .filter((e) => e.isDirectory())
      .map(async (dir) => {
        const { folderJson } = getFolderPaths(dir.name);
        return await readJsonFile<VaultFolder>(folderJson);
      })
  );

  return folders.filter(Boolean) as VaultFolder[];
};

const createFolder = async (
  folderInput: Omit<VaultFolder, "createdAt"> & { createdAt?: string }
): Promise<VaultFolder> => {
  await ensureInitialized();

  const createdAt = folderInput.createdAt || new Date().toISOString();

  const folder: VaultFolder = {
    ...folderInput,
    createdAt,
  };

  const { folderJson, itemsDir } = getFolderPaths(folder.id);
  await Promise.all([ensureDir(path.dirname(folderJson)), ensureDir(itemsDir)]);
  await writeJsonFileAtomic(folderJson, folder);

  const { manifestPath } = getVaultPaths();
  const manifest = (await readJsonFile<VaultManifest>(manifestPath)) || {
    schemaVersion: VAULT_SCHEMA_VERSION,
    encryptionVersion: 1,
    folders: [],
    masterKeyId: "",
  };

  if (!manifest.folders.includes(folder.id)) {
    manifest.folders.push(folder.id);
    await writeJsonFileAtomic(manifestPath, manifest);
  }

  return folder;
};

const updateFolder = async (folder: VaultFolder): Promise<VaultFolder> => {
  const { folderJson } = getFolderPaths(folder.id);
  await writeJsonFileAtomic(folderJson, folder);
  return folder;
};

const deleteFolder = async (folderId: string): Promise<boolean> => {
  try {
    const { folderDir } = getFolderPaths(folderId);
    await fs.promises.rm(folderDir, { recursive: true, force: true });

    const { manifestPath } = getVaultPaths();
    const manifest = await readJsonFile<VaultManifest>(manifestPath);
    if (manifest) {
      manifest.folders = manifest.folders.filter((id) => id !== folderId);
      await writeJsonFileAtomic(manifestPath, manifest);
    }

    return true;
  } catch {
    return false;
  }
};

const listItems = async (folderId: string): Promise<VaultItem[]> => {
  await ensureInitialized();
  const { itemsDir } = getFolderPaths(folderId);

  try {
    const entries = await fs.promises.readdir(itemsDir, {
      withFileTypes: true,
    });
    const metas = await Promise.all(
      entries
        .filter((e) => e.isFile() && e.name.endsWith(".json"))
        .map(async (e) => {
          return await readJsonFile<VaultItem>(path.join(itemsDir, e.name));
        })
    );
    return metas.filter(Boolean) as VaultItem[];
  } catch {
    return [];
  }
};

const saveItemMetadata = async (item: VaultItem) => {
  const { itemsDir } = getFolderPaths(item.folderId);
  await ensureDir(itemsDir);
  await writeJsonFileAtomic(path.join(itemsDir, `${item.id}.json`), item);
  return { ok: true } as const;
};

const deleteItem = async (
  folderId: string,
  itemId: string
): Promise<boolean> => {
  try {
    const { itemsDir } = getFolderPaths(folderId);
    await Promise.all([
      fs.promises.rm(path.join(itemsDir, `${itemId}.json`), { force: true }),
      fs.promises.rm(path.join(itemsDir, `${itemId}.enc`), { force: true }),
    ]);
    return true;
  } catch {
    return false;
  }
};

const jobs = new Map<string, AbortController>();

const registerJob = (jobId: string) => {
  const controller = new AbortController();
  jobs.set(jobId, controller);
  return controller;
};

const finishJob = (jobId: string) => {
  jobs.delete(jobId);
};

const cancelJob = async (jobId: string): Promise<boolean> => {
  const controller = jobs.get(jobId);
  if (!controller) return false;
  controller.abort();
  jobs.delete(jobId);
  return true;
};

const encryptPaths = async (
  jobId: string,
  folderId: string,
  inputPaths: string[]
) => {
  const sess = await requireUnlocked();
  const settings = await loadSettings();

  const controller = registerJob(jobId);

  try {
    const { itemsDir } = getFolderPaths(folderId);
    await ensureDir(itemsDir);

    const createdItems: VaultItem[] = [];

    for (const inputPath of inputPaths) {
      const stat = await fs.promises.stat(inputPath);
      const fileId = crypto.randomUUID();
      const originalName = path.basename(inputPath);
      const extension = path.extname(originalName).replace(/^\./, "");
      const displayName = originalName;
      const importedAt = new Date().toISOString();

      const nonce = crypto.randomBytes(NONCE_LENGTH_BYTES);
      const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        sess.masterKey,
        nonce
      );

      const outPath = path.join(itemsDir, `${fileId}.enc`);
      const outStream = fs.createWriteStream(outPath, { flags: "w" });

      const hash = crypto.createHash("sha256");

      let written = 0;
      let lastEmit = 0;

      const throttleEmit = (force = false) => {
        const now = Date.now();
        if (!force && now - lastEmit < 200) return;
        lastEmit = now;

        const percent = stat.size > 0 ? (written / stat.size) * 100 : undefined;
        sendProgress({
          jobId,
          fileId,
          phase: "encrypt",
          writtenBytes: written,
          totalBytes: stat.size,
          percent,
        });
      };

      const transform = new Transform({
        transform(chunk, _enc, cb) {
          written += (chunk as Buffer).length;
          hash.update(chunk as Buffer);
          throttleEmit(false);
          cb(null, chunk);
        },
      });

      await pipeline(
        fs.createReadStream(inputPath),
        cipher,
        transform,
        outStream,
        { signal: controller.signal }
      );

      const tag = cipher.getAuthTag();
      await fs.promises.appendFile(outPath, tag);
      throttleEmit(true);

      const hashCipherHex = hash.digest("hex");
      const cipherStat = await fs.promises.stat(outPath);

      const item: VaultItem = {
        id: fileId,
        folderId,
        displayName,
        originalName,
        extension,
        mimeType: "application/octet-stream",
        sizePlainBytes: stat.size,
        sizeCipherBytes: cipherStat.size,
        importedAt,
        modifiedAt: null,
        encryption: {
          schemaVersion: VAULT_SCHEMA_VERSION,
          algorithm: "AES-256-GCM",
          keyId: sess.keyId,
          nonceBase64: nonce.toString("base64"),
          tagLength: 16,
        },
        integrity: {
          hashAlg: "SHA-256",
          hashCipherHex,
        },
        flags: {
          readOnly: false,
          incognito: settings.incognitoModeEnabled,
          secretHidden: settings.secretModeEnabled,
        },
        accessControl: {
          requiresAuth: settings.authMethod !== "none",
          accessTTLSeconds: settings.autoLockSeconds,
          lastAuthAt: new Date().toISOString(),
          lockedUntil: null,
        },
        audit: {
          failedAttempts: 0,
          lastFailedAt: null,
        },
      };

      await saveItemMetadata(item);
      createdItems.push(item);
    }

    return { ok: true, items: createdItems } as const;
  } catch (error) {
    writeLog(`Vault encryptPaths error: ${String(error)}`, "error");
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as const;
  } finally {
    finishJob(jobId);
  }
};

const decryptToTemp = async (
  jobId: string,
  folderId: string,
  itemId: string,
  sessionId: string
) => {
  const sess = await requireUnlocked();
  const controller = registerJob(jobId);

  try {
    const { itemsDir } = getFolderPaths(folderId);
    const metaPath = path.join(itemsDir, `${itemId}.json`);
    const encPath = path.join(itemsDir, `${itemId}.enc`);

    const meta = await readJsonFile<VaultItem>(metaPath);
    if (!meta) return { ok: false, error: "Item metadata not found" } as const;

    const { tempDir } = getVaultPaths();
    const sessionDir = path.join(tempDir, `session_${sessionId}`);
    await ensureDir(sessionDir);

    const tempPath = path.join(sessionDir, meta.originalName);

    const stat = await fs.promises.stat(encPath);
    if (stat.size <= TAG_LENGTH_BYTES) {
      return { ok: false, error: "Invalid ciphertext" } as const;
    }

    const cipherLen = stat.size - TAG_LENGTH_BYTES;

    const fd = await fs.promises.open(encPath, "r");
    const tagBuf = Buffer.alloc(TAG_LENGTH_BYTES);
    await fd.read(tagBuf, 0, TAG_LENGTH_BYTES, cipherLen);
    await fd.close();

    const nonce = Buffer.from(meta.encryption.nonceBase64, "base64");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      sess.masterKey,
      nonce
    );
    decipher.setAuthTag(tagBuf);

    let written = 0;
    let lastEmit = 0;

    const throttleEmit = (force = false) => {
      const now = Date.now();
      if (!force && now - lastEmit < 200) return;
      lastEmit = now;
      const percent = cipherLen > 0 ? (written / cipherLen) * 100 : undefined;
      sendProgress({
        jobId,
        fileId: itemId,
        phase: "decrypt",
        writtenBytes: written,
        totalBytes: cipherLen,
        percent,
      });
    };

    const transform = new Transform({
      transform(chunk, _enc, cb) {
        written += (chunk as Buffer).length;
        throttleEmit(false);
        cb(null, chunk);
      },
    });

    await pipeline(
      fs.createReadStream(encPath, { start: 0, end: cipherLen - 1 }),
      decipher,
      transform,
      fs.createWriteStream(tempPath, { flags: "w" }),
      { signal: controller.signal }
    );

    throttleEmit(true);

    return { ok: true, tempPath } as const;
  } catch (error) {
    writeLog(`Vault decryptToTemp error: ${String(error)}`, "error");
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as const;
  } finally {
    finishJob(jobId);
  }
};

const cleanTempSession = async (sessionId: string): Promise<boolean> => {
  try {
    const { tempDir } = getVaultPaths();
    await fs.promises.rm(path.join(tempDir, `session_${sessionId}`), {
      recursive: true,
      force: true,
    });
    return true;
  } catch {
    return false;
  }
};

const zipPathsInternal = async (
  jobId: string,
  controller: AbortController,
  inputPaths: string[],
  outputPath: string
) => {
  await ensureDir(path.dirname(outputPath));

  const output = fs.createWriteStream(outputPath, { flags: "w" });
  const archive = archiver("zip", { zlib: { level: 9 } });

  let lastEmit = 0;
  archive.on("progress", (progress: archiver.ProgressData) => {
    const now = Date.now();
    if (now - lastEmit < 200) return;
    lastEmit = now;

    const processed = progress.fs.processedBytes || 0;
    const total = progress.fs.totalBytes || 0;
    const percent = total > 0 ? (processed / total) * 100 : undefined;
    sendProgress({
      jobId,
      phase: "compress",
      writtenBytes: processed,
      totalBytes: total,
      percent,
    });
  });

  const onAbort = () => {
    try {
      archive.abort();
    } catch {
      // ignore
    }
    try {
      output.destroy(new Error("aborted"));
    } catch {
      // ignore
    }
  };
  controller.signal.addEventListener("abort", onAbort, { once: true });

  archive.pipe(output);

  for (const p of inputPaths) {
    const stat = await fs.promises.stat(p);
    if (stat.isDirectory()) archive.directory(p, path.basename(p));
    else archive.file(p, { name: path.basename(p) });
  }

  await archive.finalize();

  await new Promise<void>((resolve, reject) => {
    output.on("close", () => resolve());
    output.on("error", (e) => reject(e));
    archive.on("error", (e: unknown) => reject(e));
  });

  sendProgress({
    jobId,
    phase: "compress",
    percent: 100,
    writtenBytes: 1,
    totalBytes: 1,
  });

  return { ok: true, outputPath } as const;
};

const zipPaths = async (
  jobId: string,
  inputPaths: string[],
  outputPath: string
) => {
  const controller = registerJob(jobId);

  try {
    return await zipPathsInternal(jobId, controller, inputPaths, outputPath);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as const;
  } finally {
    finishJob(jobId);
  }
};

const unzipFile = async (jobId: string, zipPath: string, outputDir: string) => {
  const controller = registerJob(jobId);

  try {
    await ensureDir(outputDir);

    const zipStat = await fs.promises.stat(zipPath);
    const total = zipStat.size;

    let read = 0;
    let lastEmit = 0;
    const progressTap = new Transform({
      transform(chunk, _enc, cb) {
        read += (chunk as Buffer).length;
        const now = Date.now();
        if (now - lastEmit >= 200) {
          lastEmit = now;
          const percent = total > 0 ? (read / total) * 100 : undefined;
          sendProgress({
            jobId,
            phase: "decompress",
            writtenBytes: read,
            totalBytes: total,
            percent,
          });
        }
        cb(null, chunk);
      },
    });

    await pipeline(
      fs.createReadStream(zipPath),
      progressTap,
      unzipper.Extract({ path: outputDir }),
      { signal: controller.signal }
    );

    sendProgress({
      jobId,
      phase: "decompress",
      percent: 100,
      writtenBytes: 1,
      totalBytes: 1,
    });
    return { ok: true, outputDir } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as const;
  } finally {
    finishJob(jobId);
  }
};

const exportBackup = async (
  jobId: string,
  outputDir: string,
  mode: "sameKey" | "reencrypt",
  password?: string
) => {
  const controller = registerJob(jobId);

  try {
    await ensureInitialized();
    await ensureDir(outputDir);

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const out = path.join(outputDir, `vault_backup_${ts}`);
    await ensureDir(out);

    const settings = await loadSettings();
    const wrapped = await loadWrappedMasterKey();
    const verifier = await loadAuthVerifier();

    if (!wrapped || !verifier) {
      return { ok: false, error: "Vault auth data not found" } as const;
    }

    let backupWrapped: VaultWrappedMasterKey = wrapped;
    let backupVerifier: VaultAuthVerifier = verifier;

    if (mode === "reencrypt") {
      if (!password) return { ok: false, error: "Password required" } as const;
      const sess = await requireUnlocked();

      const wrappedParts = await wrapMasterKey(sess.masterKey, password);
      backupWrapped = {
        schemaVersion: VAULT_SCHEMA_VERSION,
        keyId: wrapped.keyId,
        wrappedKeyBase64: wrappedParts.wrappedKeyBase64,
        wrapNonceBase64: wrappedParts.wrapNonceBase64,
        kdf: wrappedParts.kdf,
      };

      const derived = await deriveKeyScrypt(password, backupWrapped.kdf);
      backupVerifier = {
        schemaVersion: VAULT_SCHEMA_VERSION,
        method: "password",
        kdf: backupWrapped.kdf,
        verifierBase64: sha256Base64(
          Buffer.concat([derived, Buffer.from("vault-verifier")])
        ),
      };
    }

    const headerPath = path.join(out, "vault_backup.json");
    await writeJsonFileAtomic(headerPath, {
      schemaVersion: VAULT_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      mode,
      settings,
      wrappedMasterKey: backupWrapped,
      authVerifier: backupVerifier,
    });

    const vaultRoot = getVaultRoot();
    const zipPath = path.join(out, "vault.zip");

    await zipPathsInternal(jobId, controller, [vaultRoot], zipPath);

    if (controller.signal.aborted)
      return { ok: false, error: "Canceled" } as const;

    return { ok: true, outputDir: out } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as const;
  } finally {
    finishJob(jobId);
  }
};

const vaultPickFiles = async (): Promise<{
  canceled: boolean;
  paths: string[];
}> => {
  const mainWindow = dataApp.getValue("mainWindow");
  if (!mainWindow) return { canceled: true, paths: [] };

  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
  });

  return { canceled: res.canceled, paths: res.filePaths || [] };
};

const vaultPickFolders = async (): Promise<{
  canceled: boolean;
  paths: string[];
}> => {
  const mainWindow = dataApp.getValue("mainWindow");
  if (!mainWindow) return { canceled: true, paths: [] };

  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "multiSelections"],
  });

  return { canceled: res.canceled, paths: res.filePaths || [] };
};

const loadWrappedMasterKey =
  async (): Promise<VaultWrappedMasterKey | null> => {
    const str = await getStorageValue("VAULT_MASTER_KEY_WRAPPED");
    if (!str) return null;
    try {
      return JSON.parse(str) as VaultWrappedMasterKey;
    } catch {
      return null;
    }
  };

const saveWrappedMasterKey = async (data: VaultWrappedMasterKey) => {
  try {
    await saveStorageValue("VAULT_MASTER_KEY_WRAPPED", JSON.stringify(data));
    return { ok: true } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as const;
  }
};

const loadAuthVerifier = async (): Promise<VaultAuthVerifier | null> => {
  const str = await getStorageValue("VAULT_AUTH_VERIFIER");
  if (!str) return null;
  try {
    return JSON.parse(str) as VaultAuthVerifier;
  } catch {
    return null;
  }
};

const saveAuthVerifier = async (data: VaultAuthVerifier) => {
  try {
    await saveStorageValue("VAULT_AUTH_VERIFIER", JSON.stringify(data));
    return { ok: true } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as const;
  }
};

const saveSettings = async (settings: VaultSettings) => {
  try {
    await saveStorageValue("VAULT_SETTINGS", JSON.stringify(settings));
    return { ok: true } as const;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } as const;
  }
};

export const vaultHandlers = {
  vaultPickFiles,
  vaultPickFolders,
  ensureInitialized,
  loadSettings,
  saveSettings,
  loadWrappedMasterKey,
  saveWrappedMasterKey,
  loadAuthVerifier,
  saveAuthVerifier,
  listFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  listItems,
  saveItemMetadata,
  deleteItem,
  unlockVault,
  lockVault: () => {
    session = null;
  },
  encryptPaths,
  decryptToTemp,
  cleanTempSession,
  cancelJob,
  zipPaths,
  unzipFile,
  exportBackup,
};
