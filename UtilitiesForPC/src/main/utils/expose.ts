import {
  getStorageValue,
  saveStorageValue,
  removeStorageValue,
} from "./storage";
import dataApp from "./variables";
import { exec } from "child_process";
import nativeData from "./nativeData";
import { writeLog } from "./logger";
import { sendNotification } from "./notifications";
import { ChannelsIpcRenderer } from "@types";
import { createWindowClipboard } from "./clipboard";
import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { restartComputer, scheduleReconnect, turnOffComputer } from "./server";
import { vaultHandlers } from "./vault";

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
        "info"
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
          2
        )}`,
        "info"
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
        "info"
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
          "error"
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
          "error"
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
        "info"
      );
      const itemsCleaned = Array.isArray(items) ? items : [];

      dataApp.setValue("clipboardHistory", itemsCleaned);
      const clipboardWindow = dataApp.getValue("clipboardWindow");
      if (!clipboardWindow || clipboardWindow.isDestroyed())
        return createWindowClipboard();

      clipboardWindow.webContents.send(
        "clipboard-items-updated",
        itemsCleaned.map((content, index) => ({
          id: index.toString(),
          content,
        }))
      );
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

  "vault-pick-files": {
    type: "handle",
    func: async () => {
      return await vaultHandlers.vaultPickFiles();
    },
  },
  "vault-pick-folders": {
    type: "handle",
    func: async () => {
      return await vaultHandlers.vaultPickFolders();
    },
  },
  "vault-ensure-initialized": {
    type: "handle",
    func: async () => {
      return await vaultHandlers.ensureInitialized();
    },
  },
  "vault-load-settings": {
    type: "handle",
    func: async () => {
      return await vaultHandlers.loadSettings();
    },
  },
  "vault-save-settings": {
    type: "handle",
    func: async (_event, settings) => {
      return await vaultHandlers.saveSettings(settings);
    },
  },
  "vault-load-wrapped-master-key": {
    type: "handle",
    func: async () => {
      return await vaultHandlers.loadWrappedMasterKey();
    },
  },
  "vault-save-wrapped-master-key": {
    type: "handle",
    func: async (_event, wrapped) => {
      return await vaultHandlers.saveWrappedMasterKey(wrapped);
    },
  },
  "vault-load-auth-verifier": {
    type: "handle",
    func: async () => {
      return await vaultHandlers.loadAuthVerifier();
    },
  },
  "vault-save-auth-verifier": {
    type: "handle",
    func: async (_event, verifier) => {
      return await vaultHandlers.saveAuthVerifier(verifier);
    },
  },
  "vault-list-folders": {
    type: "handle",
    func: async () => {
      return await vaultHandlers.listFolders();
    },
  },
  "vault-create-folder": {
    type: "handle",
    func: async (_event, folder) => {
      return await vaultHandlers.createFolder(folder);
    },
  },
  "vault-update-folder": {
    type: "handle",
    func: async (_event, folder) => {
      return await vaultHandlers.updateFolder(folder);
    },
  },
  "vault-delete-folder": {
    type: "handle",
    func: async (_event, folderId) => {
      return await vaultHandlers.deleteFolder(folderId);
    },
  },
  "vault-list-items": {
    type: "handle",
    func: async (_event, folderId) => {
      return await vaultHandlers.listItems(folderId);
    },
  },
  "vault-save-item-metadata": {
    type: "handle",
    func: async (_event, item) => {
      return await vaultHandlers.saveItemMetadata(item);
    },
  },
  "vault-delete-item": {
    type: "handle",
    func: async (_event, folderId, itemId) => {
      return await vaultHandlers.deleteItem(folderId, itemId);
    },
  },
  "vault-unlock": {
    type: "handle",
    func: async (_event, password) => {
      return await vaultHandlers.unlockVault(password);
    },
  },
  "vault-lock": {
    type: "on",
    func: () => {
      vaultHandlers.lockVault();
    },
  },
  "vault-encrypt-paths": {
    type: "handle",
    func: async (_event, jobId, folderId, paths) => {
      return await vaultHandlers.encryptPaths(jobId, folderId, paths);
    },
  },
  "vault-decrypt-to-temp": {
    type: "handle",
    func: async (_event, jobId, folderId, itemId, sessionId) => {
      return await vaultHandlers.decryptToTemp(
        jobId,
        folderId,
        itemId,
        sessionId
      );
    },
  },
  "vault-clean-temp-session": {
    type: "handle",
    func: async (_event, sessionId) => {
      return await vaultHandlers.cleanTempSession(sessionId);
    },
  },
  "vault-cancel-job": {
    type: "handle",
    func: async (_event, jobId) => {
      return await vaultHandlers.cancelJob(jobId);
    },
  },
  "vault-zip": {
    type: "handle",
    func: async (_event, jobId, inputPaths, outputPath) => {
      return await vaultHandlers.zipPaths(jobId, inputPaths, outputPath);
    },
  },
  "vault-unzip": {
    type: "handle",
    func: async (_event, jobId, zipPath, outputDir) => {
      return await vaultHandlers.unzipFile(jobId, zipPath, outputDir);
    },
  },
  "vault-export-backup": {
    type: "handle",
    func: async (_event, jobId, outputDir, mode, password) => {
      return await vaultHandlers.exportBackup(jobId, outputDir, mode, password);
    },
  },
};

Object.entries(ipcDict).forEach(([channel, { type, func }]) => {
  ipcMain?.[type]?.(channel, func as any);
});
