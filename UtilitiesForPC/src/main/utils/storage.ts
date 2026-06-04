import {
  File,
  Task,
  Command,
  Directory,
  isSecureKey,
  ALL_KEYS_STORAGE,
  EXTENSION_ENCRYPTED,
  ALL_KEYS_STORAGE_TYPE,
  getMimeTypeFromExtension,
} from "@common";
import path from "path";
import Store from "electron-store";
import crypto from "crypto";
import dataApp from "./variables";
import { exec } from "child_process";
import { Logger } from "./logger";
import { URI_EXTENSION } from "@common";
import { app, safeStorage } from "electron";
import { FileInfo, PickedFile, FolderFiles, ElectronStoreType } from "@types";

const createSecureStorageDir = async () => {
  try {
    const dirPath = path.join(app.getPath("userData"), "secure-storage");

    const dir = new Directory(dirPath);

    if (!(await dir.exists())) await dir.mkdir({ recursive: true });
  } catch (err) {
    Logger.error("Error initializing secure storage:", err);
  }
};
createSecureStorageDir();

const store = new Store({
  name: "secure-storage",
  cwd: app.getPath("userData"),
  encryptionKey: dataApp.getValue("machineId"),
  clearInvalidConfig: true,
}) as unknown as ElectronStoreType;

const getMachineKey = async (): Promise<Buffer> => {
  try {
    let machineId = "";
    let file = new File("/etc/machine-id");
    if (await file.exists()) {
      machineId = await file.readFile();
    } else {
      file = new File("/var/lib/dbus/machine-id");
      if (await file.exists()) {
        machineId = await file.readFile();
      } else {
        machineId = "fallback-machine-id-utilities-pc";
      }
    }
    return crypto.createHash("sha256").update(machineId.trim()).digest();
  } catch (error) {
    Logger.error("Error getting machine ID:", error);
    return crypto.createHash("sha256").update("fallback-error-key").digest();
  }
};

const encryptFallback = async (text: string): Promise<string> => {
  const iv = crypto.randomBytes(16);
  const key = await getMachineKey();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `fb:${iv.toString("hex")}:${encrypted}`;
};

const decryptFallback = async (text: string): Promise<string | null> => {
  try {
    const textParts = text.split(":");
    if (textParts.length < 2) return null;

    const isPrefixed = text.startsWith("fb:");
    const ivHex = isPrefixed ? textParts[1] : textParts[0];
    const encryptedText = isPrefixed
      ? textParts.slice(2).join(":")
      : textParts.slice(1).join(":");

    if (ivHex.length !== 32 || encryptedText.length === 0) return null;
    const iv = Buffer.from(ivHex, "hex");
    const key = await getMachineKey();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    Logger.error("Error decrypting fallback:", error);
    return null;
  }
};

const decryptSafeStorage = (text: string): string | null => {
  try {
    if (!text.startsWith("ss:")) return null;
    const base64Payload = text.slice(3);
    if (!base64Payload) return null;
    const buffer = Buffer.from(base64Payload, "base64");
    return safeStorage.decryptString(buffer);
  } catch (error) {
    Logger.error("Error decrypting safeStorage:", error);
    return null;
  }
};

const verifyCommandStructure = (str: string): string | null => {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed)
      ? JSON.stringify(
          parsed.filter((item: Command) => "command" in item && "when" in item),
        )
      : null;
  } catch {
    return null;
  }
};

export const getStorageValue = async (
  key: ALL_KEYS_STORAGE_TYPE,
): Promise<string | null> => {
  try {
    const keyValue = ALL_KEYS_STORAGE[key];

    if (!isSecureKey(key)) return (store.get(keyValue) as string) ?? null;

    const storedValue = store.get(keyValue);
    if (!storedValue) return null;

    const tryVerifyCommands = (value: string): string | null => {
      if (key !== "TERMINAL_COMMANDS") return value;
      const verified = verifyCommandStructure(value);
      return verified ?? null;
    };

    if (storedValue.startsWith("ss:")) {
      if (!safeStorage.isEncryptionAvailable()) {
        Logger.error(
          `Encryption not available for key ${String(key)}(${keyValue})`,
        );
        return null;
      }
      const decrypted = decryptSafeStorage(storedValue);
      if (!decrypted) return null;
      return tryVerifyCommands(decrypted);
    }

    if (storedValue.startsWith("fb:")) {
      const fallbackDecrypted = await decryptFallback(storedValue);
      if (!fallbackDecrypted) return null;
      return tryVerifyCommands(fallbackDecrypted);
    }

    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(storedValue, "base64");
        const decrypted = safeStorage.decryptString(buffer);
        return tryVerifyCommands(decrypted);
      } catch (e) {
        const fallbackDecrypted = await decryptFallback(storedValue);
        if (fallbackDecrypted) return tryVerifyCommands(fallbackDecrypted);
        Logger.error(`Error decrypting key ${String(key)}(${keyValue}):`, e);
        return null;
      }
    }

    const fallbackDecrypted = await decryptFallback(storedValue);
    if (fallbackDecrypted) return tryVerifyCommands(fallbackDecrypted);

    Logger.error(
      `Encryption not available and fallback failed for key ${String(key)}(${keyValue})`,
    );
    return null;
  } catch (err) {
    Logger.error(`Error reading key ${String(key)}:`, err);
    return null;
  }
};

export const saveStorageValue = async <T extends ALL_KEYS_STORAGE_TYPE>(
  key: T,
  value: string,
): Promise<boolean> => {
  try {
    const keyValue = ALL_KEYS_STORAGE[key];

    const jsonValue = typeof value === "string" ? value : JSON.stringify(value);
    if (isSecureKey(key)) {
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const encrypted = safeStorage.encryptString(jsonValue);
          store.set(keyValue, `ss:${encrypted.toString("base64")}`);
        } catch {
          const fallbackEncrypted = await encryptFallback(jsonValue);
          store.set(keyValue, fallbackEncrypted);
        }
      } else {
        const fallbackEncrypted = await encryptFallback(jsonValue);
        store.set(keyValue, fallbackEncrypted);
      }
    } else {
      store.set(keyValue, value);
    }
    return true;
  } catch (err) {
    Logger.error(`Error saving key ${String(key)}:`, err);
    return false;
  }
};

export const removeStorageValue = async (
  key: ALL_KEYS_STORAGE_TYPE,
): Promise<boolean> => {
  try {
    const keyValue = ALL_KEYS_STORAGE[key];
    store.delete(keyValue);

    return true;
  } catch (err) {
    Logger.error(`Error removing key ${String(key)}: `, err);
    return false;
  }
};

const initDeviceId = async (): Promise<void> => {
  try {
    const deviceId = await getStorageValue("DEVICE_ID");
    const machineId = dataApp.getValue("machineId");
    const hashedId = crypto
      .createHash("sha256")
      .update(machineId)
      .digest("hex");

    if (deviceId === hashedId) return;

    dataApp.setValue("deviceId", hashedId);
    await saveStorageValue("DEVICE_ID", hashedId);
  } catch (error) {
    Logger.error("Error initializing device ID:", error);
  }
};
initDeviceId();

export const executeTerminalCommands = async (when: Command["when"]) => {
  if (!dataApp.getValue("hasSudo")) return;

  const commands = await getStorageValue("TERMINAL_COMMANDS");
  if (!commands) return;

  try {
    const commandsParsed = JSON.parse(commands) as Command[];
    await Promise.all(
      commandsParsed
        ?.filter((cmd) => cmd.when === when)
        ?.map((cmd) => {
          return new Promise<void>((resolve) => {
            exec(cmd.command, (error, stdout, stderr) => {
              if (error) {
                Logger.error(
                  `Command execution error for "${cmd.command}" for ${when}: ${error.message}`,
                );
              }
              if (stderr) {
                Logger.error(
                  `Command execution stderr for "${cmd.command}" for ${when}: ${stderr}`,
                );
              }
              if (stdout) {
                Logger.log(
                  `Command execution stdout for "${cmd.command}" for ${when}: ${stdout}`,
                );
              }

              resolve();
            });
          });
        }),
    );
  } catch (error) {
    Logger.error(`Error executing terminal commands for ${when}:`, error);
  }
};

const filesInTemp: Set<string> = new Set();

export const copyFileToTemp = async (
  base64: string,
  fileName: string,
): Promise<FileInfo | null> => {
  try {
    if (base64.includes("base64,")) base64 = base64.split("base64,")[1];

    const tempDir = app.getPath("temp");
    const filePath = path.join(tempDir, fileName);
    const buffer = Buffer.from(base64, "base64");
    const success = await new File(filePath).writeFile(buffer);
    if (!success) return null;

    const stats = await new File(filePath).stats();
    const extension = path.extname(fileName).slice(1);
    const mimeType = getMimeTypeFromExtension(extension);

    const info: FileInfo = {
      uri: URI_EXTENSION + filePath,
      name: fileName,
      size: stats ? Number(stats.size) : buffer.length,
      createdAt: stats ? stats.birthtime : new Date(),
      modifiedAt: stats ? stats.mtime : new Date(),
      extension,
      ...(mimeType ? { mimeType } : {}),
    };
    filesInTemp.add(filePath);

    return info;
  } catch (error) {
    Logger.error("Error copying file to temp:", error);
    return null;
  }
};

export const clearTempFiles = async (): Promise<void> => {
  try {
    await Promise.all(
      Array.from(filesInTemp).map((filePath) => {
        return new File(filePath).rm({ force: true });
      }),
    );
    filesInTemp.clear();
  } catch (error) {
    Logger.error("Error clearing temp files:", error);
  }
};

export const removeFileWithUri = async (
  uri: string,
): Promise<{ success: boolean }> => {
  try {
    const filePath = uri.replace(URI_EXTENSION, "");
    const file = new File(filePath);
    if (await file.exists()) await file.rm({ force: true });

    filesInTemp.delete(filePath);
    return { success: true };
  } catch (error) {
    Logger.error(`Error removing file with URI ${uri}: `, error);
    return { success: false };
  }
};

const encryptionTask = new Task<boolean, "ENCRYPTION">({
  fileWorker: "ENCRYPTION",
  doNotDestroy: true,
});

export const encryptFile = async (
  inputPath: string,
  outputPath: string,
  password: string,
): Promise<boolean> => {
  const result = await encryptionTask.getResult({
    functionName: "encryptData",
    data: { password, inputPath, outputPath },
  });
  if (result instanceof Error) {
    Logger.error(`Error encrypting file "${inputPath}": ${result.message}`);
    return false;
  }

  return true;
};

export const decryptFile = async (
  inputPath: string,
  outputPath: string,
  password: string,
): Promise<boolean> => {
  const result = await encryptionTask.getResult({
    functionName: "decryptData",
    data: { password, inputPath, outputPath },
  });

  if (result instanceof Error) {
    Logger.error(`Error decrypting file "${inputPath}": ${result.message}`);
    return false;
  }
  return true;
};

export const encryptFiles = async (
  files: PickedFile[],
  password: string,
  folderId: string,
): Promise<{ success: boolean; errFiles?: PickedFile[] }> => {
  try {
    const errorFiles: PickedFile[] = [];

    const directory = (await getStorageValue("VAULT_DIRECTORY")) as string;
    const outputDir = path.join(directory, folderId);
    const dir = new Directory(outputDir);
    if (!(await dir.exists())) {
      await dir.mkdir({ recursive: true });
      if (!(await dir.exists()))
        return {
          success: false,
          errFiles: files,
        };
    }

    if (errorFiles.length === 0)
      await Promise.all(
        files.map(async (file) => {
          const inputPath = file.uri.replace(URI_EXTENSION, "");

          const outputPath = path.join(
            outputDir,
            file.name + EXTENSION_ENCRYPTED,
          );

          const success = await encryptFile(inputPath, outputPath, password);
          if (!success) errorFiles.push(file);
        }),
      );

    return {
      success: errorFiles.length === 0,
      ...(errorFiles.length > 0 ? { errFiles: errorFiles } : {}),
    };
  } catch {
    return {
      success: false,
      errFiles: files,
    };
  }
};

export const getTempFolderPathForDecryptedFiles = async (
  folderId: string,
): Promise<[string, string]> => {
  const directory = (await getStorageValue("VAULT_DIRECTORY")) as string;
  const folderPath = path.join(directory, folderId);
  const file = new File(folderPath);
  if (folderId && !(await file.exists())) return ["", ""];

  const tempFolder = path.join(app.getPath("temp"), "UtilitiesForPC");
  return [tempFolder, folderPath];
};

export const decryptFiles = async (
  folderId: string,
  password: string,
): Promise<FolderFiles> => {
  try {
    const [tempFolder, folderPath] =
      await getTempFolderPathForDecryptedFiles(folderId);

    if (!tempFolder) return [];

    const dir = new Directory(tempFolder);
    if (!(await dir.exists())) {
      await dir.mkdir({ recursive: true });
      if (!(await dir.exists())) return [];
    }

    const folder = new Directory(folderPath);
    if (!(await folder.exists())) return [];
    const files = await folder.readDir();
    const decryptedFiles = await Promise.all(
      files
        .filter((file) => file.endsWith(EXTENSION_ENCRYPTED))
        .map(async (file) => {
          const originalName = file.replace(EXTENSION_ENCRYPTED, "");
          const outputPath = path.join(tempFolder, originalName);

          const filePath = path.join(folderPath, file);
          const success = await decryptFile(filePath, outputPath, password);

          if (!success) return null;

          const stats = await new File(outputPath).stats();

          const mimeType = getMimeTypeFromExtension(
            path.extname(originalName).slice(1),
          );

          const info: FolderFiles[number] = {
            uri: URI_EXTENSION + outputPath,
            name: originalName,
            size: Number(stats?.size ?? 0),
            mimeType,
            originalUri: URI_EXTENSION + filePath,
          };
          return info;
        }),
    );

    return decryptedFiles.filter((f): f is FolderFiles[number] => !!f);
  } catch (error) {
    Logger.error(
      `Error loading encrypted files from folder ${folderId}: `,
      error,
    );
    return [];
  }
};

export const actionWithVaultItem = async (
  action: "copy" | "move",
  item: FolderFiles[number],
  targetFolderId: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const directory = (await getStorageValue("VAULT_DIRECTORY")) as string;

    const sourcePath = item.originalUri.replace(URI_EXTENSION, "");
    const targetDir = path.join(directory, targetFolderId);

    const dir = new Directory(targetDir);
    if (!(await dir.exists())) {
      await dir.mkdir({ recursive: true });
      if (!(await dir.exists()))
        return { success: false, error: "Target folder does not exist." };
    }

    const fileName = path.basename(sourcePath);
    const targetPath = path.join(targetDir, fileName);
    const sourceFile = new File(sourcePath);

    if (action === "copy") await sourceFile.copyFile(targetPath);
    else if (action === "move") await sourceFile.rename(targetPath);
    else return { success: false, error: "Invalid action." };

    return { success: true };
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "Unknown error occurred.";
    Logger.error(
      `Error performing ${action} on vault item ${item.name}: ${errMsg}`,
    );
    return { success: false, error: errMsg };
  }
};

export const renameVaultItem = async (
  item: FolderFiles[number],
  newName: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const sourcePath = item.originalUri.replace(URI_EXTENSION, "");
    const targetDir = path.dirname(sourcePath);
    const targetPath = path.join(targetDir, newName);

    await new File(sourcePath).rename(targetPath);

    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    Logger.error(
      `Error renaming vault item ${item.name} to ${newName}: ${errMsg}`,
    );
    return { success: false, error: errMsg };
  }
};

export const getFileInfo = async (
  filePath: string,
): Promise<FileInfo | null> => {
  try {
    const stats = await new File(filePath).stats();
    const fileName = path.basename(filePath);
    const extension = path.extname(fileName).slice(1);
    const mimeType = getMimeTypeFromExtension(extension);

    const info: FileInfo = {
      uri: URI_EXTENSION + filePath,
      name: fileName,
      size: Number(stats?.size ?? 0),
      createdAt: stats?.birthtime ?? new Date(),
      modifiedAt: stats?.mtime ?? new Date(),
      extension,
      ...(mimeType ? { mimeType } : {}),
    };

    return info;
  } catch (error) {
    Logger.error(`Error getting file info for ${filePath}:`, error);
    return null;
  }
};

export const clearDecryptedFolderDirectory = async (): Promise<void> => {
  try {
    const [tempFolder] = await getTempFolderPathForDecryptedFiles("");
    const tempDir = new File(tempFolder);
    if (tempFolder && (await tempDir.exists()))
      await tempDir.rm({ recursive: true, force: true });
  } catch (error) {
    Logger.error("Error clearing decrypted folder directory:", error);
  }
};
