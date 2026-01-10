import {
  Command,
  isSecureKey,
  ALL_KEYS_STORAGE,
  ALL_KEYS_STORAGE_TYPE,
} from "@common";
import fs from "fs";
import path from "path";
import Store from "electron-store";
import crypto from "crypto";
import dataApp from "./variables";
import { exec } from "child_process";
import { writeLog } from "./logger";
import { app, safeStorage } from "electron";
import { ElectronStoreType } from "@types";

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
