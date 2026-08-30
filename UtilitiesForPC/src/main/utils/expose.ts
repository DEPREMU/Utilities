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
import path from "path";
import dataApp from "./variables";
import { exec } from "child_process";
import { Paths } from "@utils";
import { Logger } from "./logger";
import { zipFolder } from "./zip";
import { nativeData } from "./nativeData";
import { authenticateUser } from "./vault";
import { sendNotification } from "./notifications";
import { createPDFWithImages } from "./pdf";
import { createWindowClipboard } from "./clipboard";
import { Directory, File, Helper, Network } from "@common";
import { ChannelsIpcRenderer, MessagesClipboard } from "@types";
import { restartComputer, scheduleReconnect, turnOffComputer } from "./server";

type IpcDictHybrid = {
  [
    K in keyof ChannelsIpcRenderer
  ]: ChannelsIpcRenderer[K]["typeIpc"] extends "send"
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
      return clipboard.readText();
    },
  },
  "delete-clipboard-item": {
    type: "handle",
    func: async (_event, id) => {
      try {
        const mainWindow = dataApp.getValue("mainWindow");
        if (!mainWindow) return false;

        mainWindow.webContents.send("clipboard-message", {
          type: "delete",
          id,
        } satisfies MessagesClipboard);
        return true;
      } catch (error) {
        Logger.error("Error deleting clipboard item:", error);
      }
      return false;
    },
  },
  "delete-all-clipboard-items": {
    type: "handle",
    func: async (_event) => {
      try {
        const mainWindow = dataApp.getValue("mainWindow");
        if (!mainWindow) return false;

        mainWindow.webContents.send("clipboard-message", {
          type: "delete-all",
        } satisfies MessagesClipboard);
        return true;
      } catch (error) {
        Logger.error("Error deleting clipboard item:", error);
      }
      return false;
    },
  },
  "on-clipboard-message": {
    type: "handle",
    func: () => {
      return {
        remove: () => {},
      };
    },
  },
  "set-clipboard": {
    type: "on",
    func: (_event, text) => {
      Logger.log(
        `Received set-clipboard request with text length: ${text.length}`,
      );
      clipboard.writeText(text);
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

      Logger.log(`Received user-login-status: ${isLoggedIn}`);

      if (isLoggedIn) mainWindow.hide();
      else mainWindow.show();
    },
  },
  "set-data-electron": {
    type: "on",
    func: (_event, deviceId, language) => {
      Logger.log("Received set-data-electron request:", { deviceId, language });
      dataApp.setValue("deviceId", deviceId);
      dataApp.setValue("language", language);

      scheduleReconnect("set-data-electron called");
    },
  },
  "send-notification": {
    type: "on",
    func: (_event, notification) => {
      Logger.log("Received send-notification request:", notification);
      sendNotification(notification);
    },
  },
  "get-native-data": {
    type: "handle",
    func: async (_event, key) => {
      const result = nativeData.getValue(key);
      Logger.log(
        `Received get-native-data request for key: ${key}, value: ${result}`,
      );
      return result;
    },
  },

  "execute-command": {
    type: "handle",
    func: async (_event, command) => {
      Logger.log(`Received execute-command request: ${command}`);

      const result = await new Promise<string>((resolve) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            Logger.error(`Command execution error: ${error.message}`);
            resolve(error.message);
            return;
          }
          if (stderr) {
            Logger.error(`Command execution stderr: ${stderr}`);
            resolve(stderr);
            return;
          }
          Logger.log(`Command execution stdout: ${stdout}`);
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
        Logger.log(
          `Received create-pdf request with ${request?.images?.length || 0} images`,
        );
        const result = await createPDFWithImages(request, (progress) => {
          event.sender.send("create-pdf-progress", progress);
        });
        return result;
      } catch (error) {
        Logger.error("Error creating PDF:", error);
        return null;
      }
    },
  },
  "turn-off-computer": {
    type: "handle",
    func: async () => {
      Logger.log("Received turn-off-computer request");
      return await turnOffComputer();
    },
  },
  "restart-computer": {
    type: "handle",
    func: async () => {
      Logger.log("Received restart-computer request");
      return await restartComputer();
    },
  },
  "save-data": {
    type: "handle",
    func: async (_event, key, value) => {
      try {
        Logger.log(`Received save-data request for key: ${key}`);

        const success = await saveStorageValue(key, value);
        if (success) Logger.log(`Data saved successfully for key: ${key}`);
        else Logger.error(`Failed to save data for key: ${key}`);

        return { success };
      } catch (error) {
        Logger.error(`Error saving data for key ${key}:`, error);
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
        Logger.error(`Error loading data for key ${key}:`, error);
        return null;
      }
    },
  },
  "remove-data": {
    type: "handle",
    func: async (_event, key) => {
      Logger.log(`Received remove-data request for key: ${key}`);
      try {
        return await removeStorageValue(key);
      } catch (error) {
        Logger.error(`Failed to remove data for key: ${key}:`, error);
      }
      return false;
    },
  },
  "is-electron-build": {
    type: "handle",
    func: async () => {
      Logger.log("Received is-electron-build request");
      return true;
    },
  },
  "get-clipboard-history": {
    type: "handle",
    func: async () => {
      Logger.log("Received get-clipboard-history request");
      const clipboardItems = dataApp.getValue("clipboardHistory") || [];
      return clipboardItems;
    },
  },
  "set-clipboard-history": {
    type: "on",
    func: (_event, items) => {
      Logger.log(
        `Received set-clipboard-history request with ${items.length} items`,
      );
      const itemsCleaned = Helper.Arrays.convertToArray(items);

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
      Logger.log(`Received hide-clipboard-window request`);
      const clipboardWindow = dataApp.getValue("clipboardWindow");
      if (!clipboardWindow || clipboardWindow.isDestroyed()) return;

      clipboardWindow.hide();
    },
  },
  "show-clipboard-window": {
    type: "on",
    func: (_event) => {
      Logger.log(`Received show-clipboard-window request`);
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
      Logger.log(`Received authenticate-user request`);
      return await authenticateUser();
    },
  },

  "copy-file-to-temp": {
    type: "handle",
    func: async (_, base64, filename) => {
      try {
        const info = await copyFileToTemp(base64, filename);
        return { success: !!info, ...(info ? { info } : {}) };
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
        Logger.error(`Error removing file with URI ${uri}:`, error);
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
        const dir = new Directory(directory);
        if (!(await dir.exists())) {
          await dir.mkdir({ recursive: true });
          if (!(await dir.exists())) return "unknown";
        }
        saveStorageValue("VAULT_DIRECTORY", directory);

        return directory;
      } catch (error) {
        Logger.error(`Error getting safe folder path: `, error);
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
        Logger.error(`Error picking folder: `, error);
        return "canceled";
      }
    },
  },
  "encrypt-vault-items": {
    type: "handle",
    func: async (_event, ...args) => {
      Logger.log(`Received encrypt-vault-items request`);

      const returnValue = await encryptFiles(...args);
      return returnValue;
    },
  },
  "load-encrypted-files": {
    type: "handle",
    func: async (_event, ...args) => {
      Logger.log(`Received load-encrypted-files request`);

      const files = await decryptFiles(...args);
      return files;
    },
  },
  "action-with-vault-item": {
    type: "handle",
    func: async (_event, ...args) => {
      Logger.log(`Received action-with-vault-item request`);

      const { success, error } = await actionWithVaultItem(...args);

      return { success, ...(error ? { error } : {}) };
    },
  },
  "rename-vault-item": {
    type: "handle",
    func: async (_event, ...args) => {
      Logger.log(`Received rename-vault-item request`);

      const { success, error } = await renameVaultItem(...args);

      return { success, ...(error ? { error } : {}) };
    },
  },
  "get-file-info": {
    type: "handle",
    func: async (_event, filePath) => {
      Logger.log(`Received get-file-info request for path: ${filePath}`);
      const fileInfo = await getFileInfo(filePath);

      return fileInfo;
    },
  },
  "clear-decrypted-folder-directory": {
    type: "on",
    func: async () => {
      Logger.log(`Received clear-decrypted-folder-directory request`);
      const tempDir = path.join(
        app.getPath("temp"),
        "UtilitiesForPC",
        "decrypted",
      );

      const file = new File(tempDir);
      if (!(await file.exists())) return;

      await file.rm({ recursive: true, force: true });
      Logger.log(`Cleared decrypted folder directory at ${tempDir}`);
    },
  },
  "ask-path": {
    type: "handle",
    func: async () => {
      Logger.log(`Received ask-path request`);
      return await Paths.askPath();
    },
  },
  "zip-folder": {
    type: "handle",
    func: async (_event, ...args) => {
      const [sourceFolder, outputZipPath, password] = args;

      Logger.log(
        `Received zip-folder request for folder: ${sourceFolder}, output: ${outputZipPath}`,
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
      Logger.log(`Received delete-folder request for folderId: ${folderId}`);
      const directory = await getStorageValue("VAULT_DIRECTORY");
      if (!directory) return;

      const folderPath = path.join(directory, folderId);

      const file = new File(folderPath);
      if (!(await file.exists())) return;

      await file.rm({ recursive: true, force: true });
      Logger.log(`Deleted folder vault at ${folderPath}`);
    },
  },
  "rename-folder": {
    type: "handle",
    func: async (_event, oldFolderId, newFolderId) => {
      Logger.log(
        `Received rename-folder request from ${oldFolderId} to ${newFolderId}`,
      );
      const directory = await getStorageValue("VAULT_DIRECTORY");
      if (!directory) return;

      const oldFolderPath = path.join(directory, oldFolderId);
      const newFolderPath = path.join(directory, newFolderId);

      const dir = new File(oldFolderPath);
      if (!(await dir.exists())) return;

      const success = await dir.rename(newFolderPath);
      if (success)
        Logger.log(
          `Renamed folder vault from ${oldFolderPath} to ${newFolderPath}`,
        );
    },
  },
  "get-existing-vault-folders": {
    type: "handle",
    func: async () => {
      Logger.log(`Received get-existing-vault-folders request`);
      const directory = await getStorageValue("VAULT_DIRECTORY");
      if (!directory) return [];

      try {
        const dir = new Directory(directory);
        const folderNames = await dir.readDir.withFileTypes();
        const existingFolders = folderNames
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        return existingFolders;
      } catch (error) {
        Logger.error(
          `Error reading vault directories at ${directory}: `,
          error,
        );
        return [];
      }
    },
  },
  "has-internet-connection": {
    type: "handle",
    func: async () => await Network.isOnline(),
  },
};

Object.entries(ipcDict).forEach(([channel, { type, func }]) => {
  ipcMain?.[type]?.(channel, func as never);
});
