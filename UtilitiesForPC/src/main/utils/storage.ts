import fs from "fs";
import path from "path";
import Store from "electron-store";
import keytar from "keytar";
import { app } from "electron";
import dataApp from "./variables";
import { exec } from "child_process";
import { writeLog } from "./logger";
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

const isSecureKey = (
  key: keyof ExpectedStorageTypes<"BOTH">
): key is keyof ExpectedStorageTypes => {
  return key.startsWith("_");
};

export const getStorageFileValue = async (
  key: keyof ExpectedStorageTypes<"BOTH">
): Promise<string | null> => {
  try {
    if (isSecureKey(key)) {
      const secret = await keytar.getPassword(
        dataApp.getValue("SERVICE_NAME"),
        key
      );
      return secret;
    } else {
      return (store.get(key) as string) ?? null;
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
      await keytar.setPassword(
        dataApp.getValue("SERVICE_NAME"),
        key,
        jsonValue
      );
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
    if (isSecureKey(key))
      await keytar.deletePassword(dataApp.getValue("SERVICE_NAME"), key);
    else store.delete(key);
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
