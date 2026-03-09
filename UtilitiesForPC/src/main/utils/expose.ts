import {
  app,
  dialog,
  ipcMain,
  clipboard,
  IpcMainEvent,
  IpcMainInvokeEvent,
} from "electron";
import {
  getFileInfo,
  decryptFiles,
  encryptFiles,
  copyFileToTemp,
  getStorageValue,
  renameVaultItem,
  saveStorageValue,
  removeFileWithUri,
  removeStorageValue,
  actionWithVaultItem,
} from "./storage";
import { createPDFWithImages } from "./pdf";
import fs from "fs";
import path from "path";
import dataApp from "./variables";
import { exec } from "child_process";
import nativeData from "./nativeData";
import { writeLog } from "./logger";
import { authenticateUser } from "./vault";
import { sendNotification } from "./notifications";
import { ChannelsIpcRenderer } from "@types";
import { createWindowClipboard } from "./clipboard";
import { restartComputer, scheduleReconnect, turnOffComputer } from "./server";
import { askPath } from "@utils";
import { zipFolder } from "./zip";

type IpcDictHybrid = {
  [K in keyof ChannelsIpcRenderer]: ChannelsIpcRenderer[K]["typeIpc"] extends "send"
    ? {
        type: "on";
        func: (
          event: IpcMainEvent,
          ...args: ChannelsIpcRenderer[K]["functionArgs"]
        ) => ChannelsIpcRenderer[K]["functionReturn"];
      }
    : {
        type: "handle";
        func: (
          event: IpcMainInvokeEvent,
          ...args: ChannelsIpcRenderer[K]["functionArgs"]
        ) => ChannelsIpcRenderer[K]["functionReturn"];
      };
};

const ipcDict: IpcDictHybrid = {
  "read-clipboard": {
    type: "handle",
    func: async () => {
      return clipboard.readText("clipboard");
    },
  },
  "set-clipboard": {
    type: "on",
    func: (_event, text) => {
      writeLog(
        `Received set-clipboard request with text length: ${text.length}`,
        "info",
      );
      clipboard.writeText(text, "clipboard");
    },
  },
  "user-login-status": {
    type: "on",
    func: (_event, isLoggedIn) => {
      dataApp.setValue("userIsLoggedIn", isLoggedIn);

      if (dataApp.getValue("webRestarted")) return;
      dataApp.setValue("webRestarted", true);

      const mainWindow = dataApp.getValue("mainWindow");
      if (!mainWindow) return;

      writeLog(`Received user-login-status: ${isLoggedIn}`, "info");

      if (isLoggedIn) mainWindow.hide();
      else mainWindow.show();
    },
  },
  "set-data-electron": {
    type: "on",
    func: (_event, deviceId, language) => {
      writeLog(
        "Received set-data-electron request: " +
          JSON.stringify({ deviceId, language }, null, 2),
        "info",
      );
      dataApp.setValue("deviceId", deviceId);
      dataApp.setValue("language", language);

      scheduleReconnect("set-data-electron called");
    },
  },
  "send-notification": {
    type: "on",
    func: (_event, notification) => {
      writeLog(
        `Received send-notification request: ${JSON.stringify(
          notification,
          null,
          2,
        )}`,
        "info",
      );
      sendNotification(notification);
    },
  },
  "get-native-data": {
    type: "handle",
    func: async (_event, key) => {
      const result = nativeData.getValue(key);
      writeLog(
        `Received get-native-data request for key: ${key}, value: ${result}`,
        "info",
      );
      return result;
    },
  },

  "execute-command": {
    type: "handle",
    func: async (_event, command) => {
      writeLog(`Received execute-command request: ${command}`, "info");

      const result = await new Promise<string>((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            writeLog(`Command execution error: ${error.message}`, "error");
            resolve(error.message);
            return;
          }
          if (stderr) {
            writeLog(`Command execution stderr: ${stderr}`, "error");
            resolve(stderr);
            return;
          }
          writeLog(`Command execution stdout: ${stdout}`, "info");
          resolve(stdout);
        });
      });

      return result;
    },
  },
  "create-pdf": {
    type: "handle",
    func: async (event, request) => {
      try {
        writeLog(
          `Received create-pdf request with ${request?.images?.length || 0} images`,
          "info",
        );
        const result = await createPDFWithImages(request, (progress) => {
          event.sender.send("create-pdf-progress", progress);
        });
        return result;
      } catch (error) {
        writeLog(
          `Error creating PDF: ` + String((error as Error)?.message),
          "error",
        );
        return null;
      }
    },
  },
  "turn-off-computer": {
    type: "handle",
    func: async () => {
      writeLog("Received turn-off-computer request", "info");
      return await turnOffComputer();
    },
  },
  "restart-computer": {
    type: "handle",
    func: async () => {
      writeLog("Received restart-computer request", "info");
      return await restartComputer();
    },
  },
  "save-data": {
    type: "handle",
    func: async (_event, key, value) => {
      try {
        writeLog(`Received save-data request for key: ${key}`, "info");
        const success = await saveStorageValue(key, value);
        if (success)
          writeLog(`Data saved successfully for key: ${key}`, "info");
        else writeLog(`Failed to save data for key: ${key}`, "error");

        return { success };
      } catch (error) {
        writeLog(`Error saving data for key ${key}: ` + String(error), "error");
        return { success: false };
      }
    },
  },
  "load-data": {
    type: "handle",
    func: async (_event, key) => {
      try {
        return await getStorageValue(key);
      } catch (error) {
        writeLog(
          `Error loading data for key ${key}: ` + String(error),
          "error",
        );
        return null;
      }
    },
  },
  "remove-data": {
    type: "handle",
    func: async (_event, key) => {
      writeLog(`Received remove-data request for key: ${key}`, "info");
      try {
        return await removeStorageValue(key);
      } catch (error) {
        writeLog(
          `Failed to remove data for key: ${key}, error: ${error}`,
          "error",
        );
      }
      return false;
    },
  },
  "is-electron-build": {
    type: "handle",
    func: async () => {
      writeLog("Received is-electron-build request", "info");
      return true;
    },
  },
  "get-clipboard-history": {
    type: "handle",
    func: async () => {
      writeLog("Received get-clipboard-history request", "info");
      const clipboardItems = dataApp.getValue("clipboardHistory") || [];
      return clipboardItems;
    },
  },
  "set-clipboard-history": {
    type: "on",
    func: (_event, items) => {
      writeLog(
        `Received set-clipboard-history request with ${items.length} items`,
        "info",
      );
      const itemsCleaned = Array.isArray(items) ? items : [];

      dataApp.setValue("clipboardHistory", itemsCleaned);
      const clipboardWindow = dataApp.getValue("clipboardWindow");
      if (!clipboardWindow || clipboardWindow.isDestroyed())
        return createWindowClipboard();

      clipboardWindow.webContents.send("clipboard-items-updated", itemsCleaned);
    },
  },
  "hide-clipboard-window": {
    type: "on",
    func: (_event) => {
      writeLog(`Received hide-clipboard-window request`, "info");
      const clipboardWindow = dataApp.getValue("clipboardWindow");
      if (!clipboardWindow || clipboardWindow.isDestroyed()) return;

      clipboardWindow.hide();
    },
  },
  "show-clipboard-window": {
    type: "on",
    func: (_event) => {
      writeLog(`Received show-clipboard-window request`, "info");
      const clipboardWindow = dataApp.getValue("clipboardWindow");

      if (clipboardWindow && !clipboardWindow.isDestroyed()) {
        clipboardWindow.show();
        clipboardWindow.focus();
      } else createWindowClipboard(true);
    },
  },

  "authenticate-user": {
    type: "handle",
    func: async () => {
      writeLog(`Received authenticate-user request`, "info");
      return await authenticateUser();
    },
  },

  "copy-file-to-temp": {
    type: "handle",
    func: async (_, base64, filename) => {
      try {
        const info = await copyFileToTemp(base64, filename);
        return { success: !info, ...(info ? { info } : {}) };
      } catch {
        return { success: false };
      }
    },
  },
  "remove-file-with-uri": {
    type: "handle",
    func: async (_event, uri) => {
      try {
        return await removeFileWithUri(uri);
      } catch (error) {
        writeLog(
          `Error removing file with URI ${uri}: ` + String(error),
          "error",
        );
        return { success: false };
      }
    },
  },
  "get-safe-folder": {
    type: "handle",
    func: async () => {
      try {
        let directory = app.getPath("documents");
        if (!directory) directory = app.getPath("appData");
        if (!directory) directory = app.getPath("userData");
        if (!directory) return "unknown";

        directory = path.join(directory, "UtilitiesForPCSafe");
        try {
          if (!fs.existsSync(directory))
            fs.mkdirSync(directory, {
              recursive: true,
            });
        } catch {
          return "unknown";
        }
        saveStorageValue("VAULT_DIRECTORY", directory);

        return directory;
      } catch (error) {
        writeLog(`Error getting safe folder path: ` + String(error), "error");
        return "unknown";
      }
    },
  },
  "pick-folder": {
    type: "handle",
    func: async () => {
      try {
        const mainWindow = dataApp.getValue("mainWindow");
        if (!mainWindow) return "canceled";

        const result = await dialog.showOpenDialog(mainWindow, {
          properties: ["openDirectory"],
        });
        if (result.canceled) return "canceled";
        if (result.filePaths.length === 0) return "canceled";

        return result.filePaths[0];
      } catch (error) {
        writeLog(`Error picking folder: ` + String(error), "error");
        return "canceled";
      }
    },
  },
  "encrypt-vault-items": {
    type: "handle",
    func: async (_event, ...args) => {
      writeLog(`Received encrypt-vault-items request`, "info");

      const returnValue = await encryptFiles(...args);
      return returnValue;
    },
  },
  "load-encrypted-files": {
    type: "handle",
    func: async (_event, ...args) => {
      writeLog(`Received load-encrypted-files request`, "info");

      const files = await decryptFiles(...args);
      return files;
    },
  },
  "action-with-vault-item": {
    type: "handle",
    func: async (_event, ...args) => {
      writeLog(`Received action-with-vault-item request`, "info");

      const { success, error } = await actionWithVaultItem(...args);

      return { success, ...(error ? { error } : {}) };
    },
  },
  "rename-vault-item": {
    type: "handle",
    func: async (_event, ...args) => {
      writeLog(`Received rename-vault-item request`, "info");

      const { success, error } = await renameVaultItem(...args);

      return { success, ...(error ? { error } : {}) };
    },
  },
  "get-file-info": {
    type: "handle",
    func: async (_event, filePath) => {
      writeLog(`Received get-file-info request for path: ${filePath}`, "info");
      const fileInfo = await getFileInfo(filePath);

      return fileInfo;
    },
  },
  "clear-decrypted-folder-directory": {
    type: "on",
    func: async () => {
      writeLog(`Received clear-decrypted-folder-directory request`, "info");
      const tempDir = path.join(
        app.getPath("temp"),
        "UtilitiesForPC",
        "decrypted",
      );

      try {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          writeLog(`Cleared decrypted folder directory at ${tempDir}`, "info");
        }
      } catch (error) {
        writeLog(
          `Error clearing decrypted folder directory at ${tempDir}: ` +
            String(error),
          "error",
        );
      }
    },
  },
  "ask-path": {
    type: "handle",
    func: async () => {
      writeLog(`Received ask-path request`, "info");
      return await askPath();
    },
  },
  "zip-folder": {
    type: "handle",
    func: async (_event, ...args) => {
      const [sourceFolder, outputZipPath, password] = args;

      writeLog(
        `Received zip-folder request for folder: ${sourceFolder}, output: ${outputZipPath}`,
        "info",
      );
      const mainWindow = dataApp.getValue("mainWindow");
      if (!mainWindow) return "";

      const onProgress = (
        progress: number,
        filename: string,
        fileCount: number,
      ) => {
        mainWindow.webContents.send("zip-folder-data", {
          number: progress,
          filename,
          fileCount,
        });
      };
      const onError = (error: Error) => {
        mainWindow.webContents.send("zip-folder-data", null, error);
      };

      const result = await zipFolder(
        sourceFolder,
        outputZipPath,
        password,
        onProgress,
        onError,
      );

      return result;
    },
  },
  "delete-folder": {
    type: "handle",
    func: async (_event, folderId) => {
      writeLog(
        `Received delete-folder request for folderId: ${folderId}`,
        "info",
      );
      const directory = await getStorageValue("VAULT_DIRECTORY");
      if (!directory) return;

      const folderPath = path.join(directory, folderId);
      try {
        if (!fs.existsSync(folderPath)) return;

        await fs.promises.rm(folderPath, { recursive: true, force: true });
        writeLog(`Deleted folder vault at ${folderPath}`, "info");
      } catch (error) {
        writeLog(
          `Error deleting folder vault at ${folderPath}: ` + String(error),
          "error",
        );
      }
    },
  },
  "rename-folder": {
    type: "handle",
    func: async (_event, oldFolderId, newFolderId) => {
      writeLog(
        `Received rename-folder request from ${oldFolderId} to ${newFolderId}`,
        "info",
      );
      const directory = await getStorageValue("VAULT_DIRECTORY");
      if (!directory) return;

      const oldFolderPath = path.join(directory, oldFolderId);
      const newFolderPath = path.join(directory, newFolderId);

      try {
        if (!fs.existsSync(oldFolderPath)) return;

        await fs.promises.rename(oldFolderPath, newFolderPath);
        writeLog(
          `Renamed folder vault from ${oldFolderPath} to ${newFolderPath}`,
          "info",
        );
      } catch {
        // Ignore error
      }
    },
  },
  "get-existing-vault-folders": {
    type: "handle",
    func: async () => {
      writeLog(`Received get-existing-vault-folders request`, "info");
      const directory = await getStorageValue("VAULT_DIRECTORY");
      if (!directory) return [];

      try {
        const folderNames = await fs.promises.readdir(directory, {
          withFileTypes: true,
        });
        const existingFolders = folderNames
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        return existingFolders;
      } catch (error) {
        writeLog(
          `Error reading vault directories at ${directory}: ` + String(error),
          "error",
        );
        return [];
      }
    },
  },
};

Object.entries(ipcDict).forEach(([channel, { type, func }]) => {
  ipcMain?.[type]?.(channel, func as never);
});
