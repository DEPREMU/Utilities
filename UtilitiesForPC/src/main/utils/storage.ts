import {
  Command,
  isSecureKey,
  ALL_KEYS_STORAGE,
  ALL_KEYS_STORAGE_TYPE,
  wrapFunctionWithError,
  getMimeTypeFromExtension,
  EXTENSION_ENCRYPTED,
} from "@common";
import fs from "fs";
import path from "path";
import Store from "electron-store";
import crypto from "crypto";
import dataApp from "./variables";
import { exec } from "child_process";
import { writeLog } from "./logger";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { URI_EXTENSION } from "@common";
import { app, safeStorage } from "electron";
import { ElectronStoreType, FileInfo, FolderFiles, PickedFile } from "@types";

const initFileStorage = (): void => {
  try {
    const dir = path.join(app.getPath("userData"), "secure-storage");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error("Error initializing secure storage:", err);
  }
};
initFileStorage();

const store = new Store({
  name: "secure-storage",
  cwd: app.getPath("userData"),
  encryptionKey: dataApp.getValue("machineId"),
  clearInvalidConfig: true,
}) as unknown as ElectronStoreType;

const getMachineKey = (): Buffer => {
  try {
    let machineId = "";
    if (fs.existsSync("/etc/machine-id")) {
      machineId = fs.readFileSync("/etc/machine-id", "utf-8").trim();
    } else if (fs.existsSync("/var/lib/dbus/machine-id")) {
      machineId = fs.readFileSync("/var/lib/dbus/machine-id", "utf-8").trim();
    } else {
      machineId = "fallback-machine-id-utilities-pc";
    }
    return crypto.createHash("sha256").update(machineId).digest();
  } catch (error) {
    console.error("Error getting machine ID:", error);
    return crypto.createHash("sha256").update("fallback-error-key").digest();
  }
};

const encryptFallback = (text: string): string => {
  const iv = crypto.randomBytes(16);
  const key = getMachineKey();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decryptFallback = (text: string): string | null => {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = textParts.join(":");
    const key = getMachineKey();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Error decrypting fallback:", error);
    return null;
  }
};

const verifyCommandStructure = (str: string): string | null => {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed)
      ? JSON.stringify(
          parsed.filter((item: Command) => "command" in item && "when" in item)
        )
      : null;
  } catch (error) {
    return null;
  }
};

export const getStorageValue = async (
  key: ALL_KEYS_STORAGE_TYPE
): Promise<string | null> => {
  try {
    const keyValue = ALL_KEYS_STORAGE[key];

    if (!isSecureKey(key)) return (store.get(keyValue) as string) ?? null;

    const storedValue = store.get(keyValue as any) as string;
    if (!storedValue) return null;

    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(storedValue, "base64");
        const decrypted = safeStorage.decryptString(buffer);

        if (key === "TERMINAL_COMMANDS") {
          const verified = verifyCommandStructure(decrypted);
          if (verified) return verified;
        }

        return decrypted;
      } catch (e) {
        const fallbackDecrypted = decryptFallback(storedValue);
        if (fallbackDecrypted) {
          return fallbackDecrypted;
        }

        writeLog(
          `Error decrypting key ${String(key)}(${keyValue}): ${e}`,
          "error"
        );
        return null;
      }
    } else {
      const fallbackDecrypted = decryptFallback(storedValue);
      if (fallbackDecrypted) {
        if (key === "TERMINAL_COMMANDS") {
          const verified = verifyCommandStructure(fallbackDecrypted);
          if (verified) return verified;
        }

        return fallbackDecrypted;
      }

      writeLog(
        `Encryption not available and fallback failed for key ${String(key)}(${keyValue})`,
        "error"
      );
      return null;
    }
  } catch (error) {
    const err = typeof error === "string" ? error : JSON.stringify(error);
    writeLog(`Error reading key ${String(key)}: ` + err, "error");
    console.error(`Error reading key ${String(key)}:`, error);
    return null;
  }
};

export const saveStorageValue = async <T extends ALL_KEYS_STORAGE_TYPE>(
  key: T,
  value: string
): Promise<boolean> => {
  try {
    const keyValue = ALL_KEYS_STORAGE[key];

    const jsonValue = typeof value === "string" ? value : JSON.stringify(value);
    if (isSecureKey(key)) {
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const encrypted = safeStorage.encryptString(jsonValue);
          store.set(keyValue, encrypted.toString("base64"));
        } catch (e) {
          const fallbackEncrypted = encryptFallback(jsonValue);
          store.set(keyValue, fallbackEncrypted);
        }
      } else {
        const fallbackEncrypted = encryptFallback(jsonValue);
        store.set(keyValue, fallbackEncrypted);
      }
    } else {
      store.set(keyValue, value);
    }
    return true;
  } catch (error) {
    const err = typeof error === "string" ? error : JSON.stringify(error);
    writeLog(`Error saving key ${String(key)}: ` + err, "error");
    console.error(`Error saving key ${String(key)}:`, error);
    return false;
  }
};

export const removeStorageValue = async (
  key: ALL_KEYS_STORAGE_TYPE
): Promise<boolean> => {
  try {
    const keyValue = ALL_KEYS_STORAGE[key];
    if (!isSecureKey(key)) store.delete(keyValue);

    return true;
  } catch (error) {
    const err = typeof error === "string" ? error : JSON.stringify(error);
    writeLog(`Error removing key ${String(key)}: ` + err, "error");
    console.error(`Error removing key ${String(key)}:`, error);
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
    console.error("Error initializing device ID:", error);
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
          return new Promise<1>((resolve) => {
            try {
              exec(cmd.command, (error, stdout, stderr) => {
                if (error) {
                  writeLog(
                    `Command execution error for "${cmd.command}" for ${when}: ${error.message}`,
                    "error"
                  );
                }
                if (stderr) {
                  writeLog(
                    `Command execution stderr for "${cmd.command}" for ${when}: ${stderr}`,
                    "error"
                  );
                }
                if (stdout) {
                  writeLog(
                    `Command execution stdout for "${cmd.command}" for ${when}: ${stdout}`,
                    "info"
                  );
                }

                resolve(1);
              });
            } catch (error) {
              writeLog(
                `Error executing command "${cmd.command}" for ${when}: ` +
                  (typeof error === "string" ? error : JSON.stringify(error)),
                "error"
              );
            } finally {
              resolve(1);
            }
          });
        })
    );
  } catch (error) {
    writeLog(
      `Error executing terminal commands for ${when}: ` +
        (typeof error === "string" ? error : JSON.stringify(error)),
      "error"
    );
  }
};

let filesInTemp: Set<string> = new Set();

export const copyFileToTemp = async (
  base64: string,
  fileName: string
): Promise<FileInfo | null> => {
  try {
    console.log("Copying file to temp:", fileName, base64.slice(0, 30) + "...");
    if (base64.includes("base64,")) base64 = base64.split("base64,")[1];

    const tempDir = app.getPath("temp");
    const filePath = path.join(tempDir, fileName);
    const buffer = Buffer.from(base64, "base64");
    const success = await new Promise<boolean>((r) => {
      fs.writeFile(filePath, buffer, (err) => r(!err));
    });
    console.log({ success, filePath });
    if (!success) return null;

    const stats = await new Promise<fs.Stats | null>((r) => {
      fs.stat(filePath, (err, stats) => r(err ? null : stats));
    });
    const extension = path.extname(fileName).slice(1);
    const mimeType = getMimeTypeFromExtension(extension);

    const info: FileInfo = {
      uri: URI_EXTENSION + filePath,
      name: fileName,
      size: stats ? stats.size : buffer.length,
      createdAt: stats ? stats.birthtime : new Date(),
      modifiedAt: stats ? stats.mtime : new Date(),
      extension,
      ...(mimeType ? { mimeType } : {}),
    };
    filesInTemp.add(filePath);

    console.log(info);
    return info;
  } catch (error) {
    writeLog(
      `Error copying file to temp: ` + String((error as Error)?.message),
      "error"
    );
    return null;
  }
};

export const clearTempFiles = async (): Promise<void> => {
  try {
    await Promise.all(
      Array.from(filesInTemp).map(
        (filePath) =>
          new Promise<void>((resolve) => {
            fs.unlink(filePath, (err) => {
              if (err) {
                writeLog(
                  `Error deleting temp file ${filePath}: ` + String(err),
                  "error"
                );
              }
              resolve();
            });
          })
      )
    );
    filesInTemp.clear();
  } catch (error) {
    writeLog(
      `Error clearing temp files: ` + String((error as Error)?.message),
      "error"
    );
  }
};

export const removeFileWithUri = async (
  uri: string
): Promise<{ success: boolean }> => {
  try {
    const filePath = uri.replace(URI_EXTENSION, "");
    await new Promise<void>((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    filesInTemp.delete(filePath);
    return { success: true };
  } catch (error) {
    writeLog(
      `Error removing file with URI ${uri}: ` +
        String((error as Error)?.message),
      "error"
    );
    return { success: false };
  }
};

const pbkdf2Async = promisify(crypto.pbkdf2);

const deriveKey = async (password: string, salt: Buffer): Promise<Buffer> => {
  return (await pbkdf2Async(password, salt, 100000, 32, "sha256")) as Buffer;
};

export const encryptFile = wrapFunctionWithError(
  async (
    inputPath: string,
    outputPath: string,
    password: string
  ): Promise<boolean> => {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);

    const key = await deriveKey(password, salt);

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    output.write(salt);
    output.write(iv);

    const tagPlaceholder = Buffer.alloc(16, 0);
    output.write(tagPlaceholder);

    await pipeline(input, cipher, output);

    const authTag = cipher.getAuthTag();

    const fd = await fs.promises.open(outputPath, "r+");
    try {
      await fd.write(authTag, 0, 16, 28);
    } finally {
      await fd.close();
    }

    return true;
  },
  true,
  (_, errMsg, inputPath) => {
    writeLog(`Error encrypting file "${inputPath}": ${errMsg}`, "error");
    return false;
  }
);

export const decryptFile = wrapFunctionWithError(
  async (
    inputPath: string,
    outputPath: string,
    password: string
  ): Promise<boolean> => {
    const headerBuffer = Buffer.alloc(44);
    const fd = await fs.promises.open(inputPath, "r");

    const { bytesRead } = await fd.read(headerBuffer, 0, 44, 0);
    if (bytesRead < 44) return false;

    await fd.close();

    const salt = headerBuffer.subarray(0, 16);
    const iv = headerBuffer.subarray(16, 28);
    const authTag = headerBuffer.subarray(28, 44);

    const key = await deriveKey(password, salt);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const input = fs.createReadStream(inputPath, { start: 44 });
    const output = fs.createWriteStream(outputPath);

    await pipeline(input, decipher, output);
    return true;
  },
  true,
  (_, errMsg, inputPath) => {
    writeLog(`Error decrypting file "${inputPath}": ${errMsg}`, "error");
    return false;
  }
);

export const encryptFiles = async (
  files: PickedFile[],
  password: string,
  folderId: string
): Promise<{ success: boolean; errFiles?: PickedFile[] }> => {
  try {
    let errorFiles: PickedFile[] = [];

    await Promise.all(
      files.map(async (file) => {
        const inputPath = file.uri.replace(URI_EXTENSION, "");
        const directory = (await getStorageValue("VAULT_DIRECTORY")) as string;
        const outputDir = path.join(directory, folderId);
        try {
          const stats = await fs.promises.stat(outputDir);
          if (!stats.isDirectory())
            await fs.promises.mkdir(outputDir, {
              recursive: true,
            });
        } catch {
          errorFiles.push(file);
          return;
        }
        const outputPath = path.join(
          outputDir,
          file.name + EXTENSION_ENCRYPTED
        );

        const success = await encryptFile(inputPath, outputPath, password);
        if (!success) errorFiles.push(file);
      })
    );

    return {
      success: errorFiles.length === 0,
      ...(errorFiles.length > 0 ? { errFiles: errorFiles } : {}),
    };
  } catch (error) {
    return {
      success: false,
      errFiles: files,
    };
  }
};

export const getTempFolderPathForDecryptedFiles = async (
  folderId: string
): Promise<[string, string]> => {
  const directory = (await getStorageValue("VAULT_DIRECTORY")) as string;
  const folderPath = path.join(directory, folderId);
  if (folderId && !fs.existsSync(folderPath)) return ["", ""];

  const tempFolder = path.join(app.getPath("temp"), "UtilitiesForPC");
  return [tempFolder, folderPath];
};

export const decryptFiles = async (
  folderId: string,
  password: string
): Promise<FolderFiles> => {
  try {
    const [tempFolder, folderPath] =
      await getTempFolderPathForDecryptedFiles(folderId);

    if (!tempFolder) return [];

    try {
      if (!fs.existsSync(tempFolder))
        fs.mkdirSync(tempFolder, {
          recursive: true,
        });
    } catch {
      return [];
    }

    const files = await fs.promises.readdir(folderPath);
    const decryptedFiles = await Promise.all(
      files
        .filter((file) => file.endsWith(EXTENSION_ENCRYPTED))
        .map(async (file) => {
          const originalName = file.replace(EXTENSION_ENCRYPTED, "");
          const outputPath = path.join(tempFolder, originalName);

          const filePath = path.join(folderPath, file);
          const success = await decryptFile(filePath, outputPath, password);

          if (!success) return null;

          const stats = await fs.promises.stat(outputPath);

          const mimeType = getMimeTypeFromExtension(
            path.extname(originalName).slice(1)
          );

          const info: FolderFiles[number] = {
            uri: URI_EXTENSION + outputPath,
            name: originalName,
            size: stats.size,
            mimeType,
            originalUri: URI_EXTENSION + filePath,
          };
          return info;
        })
    );

    return decryptedFiles.filter((f): f is FolderFiles[number] => !!f);
  } catch (error) {
    writeLog(
      `Error loading encrypted files from folder ${folderId}: ` +
        String((error as Error)?.message),
      "error"
    );
    return [];
  }
};

export const actionWithVaultItem = async (
  action: "copy" | "move",
  item: FolderFiles[number],
  targetFolderId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const directory = (await getStorageValue("VAULT_DIRECTORY")) as string;

    const sourcePath = item.originalUri.replace(URI_EXTENSION, "");
    const targetDir = path.join(directory, targetFolderId);
    try {
      const stats = await fs.promises.stat(targetDir);
      if (!stats.isDirectory())
        await fs.promises.mkdir(targetDir, {
          recursive: true,
        });
    } catch (err) {
      return { success: false, error: "Target folder does not exist." };
    }

    const fileName = path.basename(sourcePath);
    const targetPath = path.join(targetDir, fileName);

    if (action === "copy") await fs.promises.copyFile(sourcePath, targetPath);
    else if (action === "move")
      await fs.promises.rename(sourcePath, targetPath);
    else return { success: false, error: "Invalid action." };

    return { success: true };
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "Unknown error occurred.";
    writeLog(
      `Error performing ${action} on vault item ${item.name}: ${errMsg}`,
      "error"
    );
    return { success: false, error: errMsg };
  }
};

export const renameVaultItem = async (
  item: FolderFiles[number],
  newName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const sourcePath = item.originalUri.replace(URI_EXTENSION, "");
    const targetDir = path.dirname(sourcePath);
    const targetPath = path.join(targetDir, newName);

    await fs.promises.rename(sourcePath, targetPath);

    return { success: true };
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : "Unknown error occurred.";
    writeLog(
      `Error renaming vault item ${item.name} to ${newName}: ${errMsg}`,
      "error"
    );
    return { success: false, error: errMsg };
  }
};

export const getFileInfo = async (
  filePath: string
): Promise<FileInfo | null> => {
  try {
    const stats = await fs.promises.stat(filePath);
    const fileName = path.basename(filePath);
    const extension = path.extname(fileName).slice(1);
    const mimeType = getMimeTypeFromExtension(extension);

    const info: FileInfo = {
      uri: URI_EXTENSION + filePath,
      name: fileName,
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      extension,
      ...(mimeType ? { mimeType } : {}),
    };

    return info;
  } catch (error) {
    writeLog(
      `Error getting file info for ${filePath}: ` +
        String((error as Error)?.message),
      "error"
    );
    return null;
  }
};

export const clearDecryptedFolderDirectory = async (): Promise<void> => {
  try {
    const [tempFolder] = await getTempFolderPathForDecryptedFiles("");
    if (tempFolder && fs.existsSync(tempFolder))
      fs.rmSync(tempFolder, { recursive: true, force: true });
  } catch (error) {
    writeLog(
      `Error clearing decrypted folder directory: ` +
        String((error as Error)?.message || error),
      "error"
    );
  }
};
