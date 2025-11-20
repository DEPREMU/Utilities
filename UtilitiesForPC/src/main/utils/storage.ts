import fs from "fs";
import path from "path";
import Store from "electron-store";
import crypto from "crypto";
import dataApp from "./variables";
import { exec } from "child_process";
import { writeLog } from "./logger";
import { app, safeStorage } from "electron";
import { Command, ElectronStoreType, ExpectedStorageTypes } from "@types";

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
  encryptionKey: dataApp.getValue("encryptionKey"),
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

const isSecureKey = (
  key: keyof ExpectedStorageTypes<"BOTH">
): key is keyof ExpectedStorageTypes => {
  return key.startsWith("_");
};

export const getStorageFileValue = async (
  key: keyof ExpectedStorageTypes<"BOTH">
): Promise<string | null> => {
  try {
    if (!isSecureKey(key)) return (store.get(key) as string) ?? null;

    const storedValue = store.get(key as any) as string;
    if (!storedValue) return null;

    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(storedValue, "base64");
        const decrypted = safeStorage.decryptString(buffer);
        return decrypted;
      } catch (e) {
        const fallbackDecrypted = decryptFallback(storedValue);
        if (fallbackDecrypted) return fallbackDecrypted;

        writeLog(`Error decrypting key ${String(key)}: ${e}`, "error");
        return null;
      }
    } else {
      const fallbackDecrypted = decryptFallback(storedValue);
      if (fallbackDecrypted) return fallbackDecrypted;

      writeLog(
        `Encryption not available and fallback failed for key ${String(key)}`,
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

export const saveStorageFileValue = async <
  T extends keyof ExpectedStorageTypes<"BOTH">
>(
  key: T,
  value: string
): Promise<boolean> => {
  try {
    const jsonValue = typeof value === "string" ? value : JSON.stringify(value);
    if (isSecureKey(key)) {
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const encrypted = safeStorage.encryptString(jsonValue);
          store.set(key, encrypted.toString("base64"));
        } catch (e) {
          const fallbackEncrypted = encryptFallback(jsonValue);
          store.set(key, fallbackEncrypted);
        }
      } else {
        const fallbackEncrypted = encryptFallback(jsonValue);
        store.set(key, fallbackEncrypted);
      }
    } else {
      store.set(key, value);
    }
    return true;
  } catch (error) {
    const err = typeof error === "string" ? error : JSON.stringify(error);
    writeLog(`Error saving key ${String(key)}: ` + err, "error");
    console.error(`Error saving key ${String(key)}:`, error);
    return false;
  }
};

export const removeStorageFileValue = async (
  key: keyof ExpectedStorageTypes<"BOTH">
): Promise<boolean> => {
  try {
    store.delete(key);

    return true;
  } catch (error) {
    const err = typeof error === "string" ? error : JSON.stringify(error);
    writeLog(`Error removing key ${String(key)}: ` + err, "error");
    console.error(`Error removing key ${String(key)}:`, error);
    return false;
  }
};

export const executeTerminalCommands = async (when: Command["when"]) => {
  if (!dataApp.getValue("hasSudo")) return;

  const commands = await getStorageFileValue("_terminalCommands");
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
