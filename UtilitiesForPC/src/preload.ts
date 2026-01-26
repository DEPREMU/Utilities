import {
  ContextBridgeType,
  LanguagesSupported,
  ChannelsIpcRenderer,
} from "@types";
import { ALL_KEYS_STORAGE_TYPE } from "@common";
import { IpcRenderer, Clipboard, ContextBridge } from "electron";

const { clipboard, contextBridge, ipcRenderer } = require("electron") as {
  clipboard: Clipboard;
  ipcRenderer: IpcRenderer;
  contextBridge: ContextBridge;
};

const sendLog = (message: string, level: "info" | "warn" | "error") => {
  fetch("http://localhost:3005/log", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, level }),
  }).catch(() => {
    // ignore
  });
};

const sendMessage = async <
  T extends ALL_KEYS_STORAGE_TYPE,
  K extends keyof ChannelsIpcRenderer<T> = keyof ChannelsIpcRenderer<T>,
  V extends ChannelsIpcRenderer<T>[K]["functionArgs"] =
    ChannelsIpcRenderer<T>[K]["functionArgs"],
>(
  type: ChannelsIpcRenderer<T>[K]["typeIpc"],
  channel: K,
  ...args: V
): Promise<ChannelsIpcRenderer<T>[K]["functionReturn"]> => {
  return await ipcRenderer?.[type]?.(channel, ...args);
};

let idleTimeout: NodeJS.Timeout | number | null = null;

const contextBridgeType: ContextBridgeType = {
  UtilitiesForPC: {
    readClipboard: () => {
      try {
        return clipboard.readText();
      } catch {
        return "";
      }
    },
    setClipboard: (text: string) => {
      try {
        if (text) clipboard.writeText(text);
      } catch {
        // ignore
      }
    },
    notifyLoginStatus: (isLoggedIn: boolean) => {
      if (process.env.BUILD_PROFILE === "development") return;

      if (idleTimeout) {
        clearTimeout(idleTimeout);
        idleTimeout = null;
      }

      idleTimeout = setTimeout(() => {
        idleTimeout = null;
        sendMessage("send", "user-login-status", isLoggedIn);
      }, 500);
    },
    setData: (deviceId: string, language: LanguagesSupported) => {
      sendMessage("send", "set-data-electron", deviceId, language);
    },

    turnOffComputer: async () => {
      return await sendMessage("invoke", "turn-off-computer");
    },

    restartComputer: async () => {
      return await sendMessage("invoke", "restart-computer");
    },

    getNativeData: async (
      ...args: ChannelsIpcRenderer["get-native-data"]["functionArgs"]
    ) => {
      try {
        return await sendMessage("invoke", "get-native-data", ...args);
      } catch (error) {
        sendLog(
          `Error getting native data for key ${args[0]}: ` + String(error),
          "error",
        );
        return "unknown";
      }
    },

    saveData: async (key, value) => {
      try {
        return await sendMessage("invoke", "save-data", key, value);
      } catch (error) {
        sendLog(`Error saving data for key ${key}: ` + String(error), "error");
        return { success: false };
      }
    },

    loadData: async (key) => {
      try {
        const result = await sendMessage<typeof key, "load-data">(
          "invoke",
          "load-data",
          key,
        );
        return result;
      } catch (error) {
        sendLog(`Error loading data for key ${key}: ` + String(error), "error");
        return null;
      }
    },

    removeData: async (key) => {
      try {
        const result = await sendMessage("invoke", "remove-data", key);
        return result;
      } catch (error) {
        sendLog(
          `Error removing data for key ${key}: ` + String(error),
          "error",
        );
        return false;
      }
    },

    isElectronBuild: async () => {
      sendLog("Checking if Electron build...", "info");
      const isElectron = await sendMessage("invoke", "is-electron-build");
      sendLog(`isElectronBuild: ${isElectron}`, "info");
      return isElectron;
    },

    sendNotification: (notification) => {
      sendMessage("send", "send-notification", notification);
    },

    executeCommand: async (command) => {
      try {
        const result = await sendMessage("invoke", "execute-command", command);
        return result;
      } catch (error) {
        sendLog(
          `Error executing command "${command}": ` + String(error),
          "error",
        );
        return error instanceof Error ? error.message : String(error);
      }
    },
    getClipboardHistory: async () => {
      try {
        const result = await sendMessage("invoke", "get-clipboard-history");
        return result;
      } catch (error) {
        sendLog(`Error getting clipboard history: ` + String(error), "error");
        return [];
      }
    },
    setClipboardHistory: (items: string[]) => {
      sendMessage("send", "set-clipboard-history", items);
    },
    hideClipboardWindow: () => {
      sendMessage("send", "hide-clipboard-window");
    },
    showClipboardWindow: () => {
      sendMessage("send", "show-clipboard-window");
    },
    onClipboardItemsUpdated: (
      callback: (items: Array<{ id: string; content: string }>) => void,
    ) => {
      ipcRenderer.on("clipboard-items-updated", (_event, items) => {
        callback(items);
      });
    },

    authenticate: async () => {
      try {
        const isAuthenticated = await sendMessage(
          "invoke",
          "authenticate-user",
        );
        return isAuthenticated;
      } catch (error) {
        sendLog(
          `Error during authentication: ` + (error as Error).message,
          "error",
        );
        return false;
      }
    },
    copyFileToTemp: async (base64: string, fileName: string) => {
      try {
        const result = await sendMessage(
          "invoke",
          "copy-file-to-temp",
          base64,
          fileName,
        );
        return result;
      } catch (error) {
        sendLog(
          `Error copying file to temp: ` + (error as Error).message,
          "error",
        );
        return { success: false };
      }
    },
    removeFile: async (uri: string) => {
      try {
        return await sendMessage("invoke", "remove-file-with-uri", uri);
      } catch (error) {
        sendLog(
          `Error removing file from temp: ` + (error as Error).message,
          "error",
        );
        return { success: false };
      }
    },
    getSafeFolder: async () => {
      try {
        const directory = await sendMessage("invoke", "get-safe-folder");
        return directory;
      } catch (error) {
        sendLog(
          `Error getting safe folder: ` + (error as Error).message,
          "error",
        );
        return "unknown";
      }
    },
    pickFolder: async () => {
      try {
        const result = await sendMessage("invoke", "pick-folder");
        return result;
      } catch (error) {
        sendLog(`Error picking folder: ` + (error as Error).message, "error");
        return "canceled";
      }
    },
    encryptFiles: async (...args) => {
      try {
        const result = await sendMessage(
          "invoke",
          "encrypt-vault-items",
          ...args,
        );
        return result;
      } catch (error) {
        sendLog(
          `Error encrypting vault items: ` + (error as Error).message,
          "error",
        );
        return { success: false };
      }
    },
    loadEncryptedFiles: async (...args) => {
      try {
        const result = await sendMessage(
          "invoke",
          "load-encrypted-files",
          ...args,
        );
        return result;
      } catch (error) {
        sendLog(
          `Error loading encrypted files: ` + (error as Error).message,
          "error",
        );
        return [];
      }
    },
    renameVaultItem: async (...args) => {
      try {
        const result = await sendMessage(
          "invoke",
          "rename-vault-item",
          ...args,
        );
        return result;
      } catch (error) {
        sendLog(
          `Error renaming vault item: ` + (error as Error).message,
          "error",
        );
        return { success: false };
      }
    },
    actionWithVaultItem: async (...args) => {
      try {
        const result = await sendMessage(
          "invoke",
          "action-with-vault-item",
          ...args,
        );
        return result;
      } catch (error) {
        sendLog(
          `Error performing action with vault item: ` +
            (error as Error).message,
          "error",
        );
        return { success: false };
      }
    },
    getFileInfo: async (filePath: string) => {
      try {
        const result = await sendMessage("invoke", "get-file-info", filePath);
        return result;
      } catch (error) {
        sendLog(
          `Error getting file info for "${filePath}": ` +
            (error as Error).message,
          "error",
        );
        return null;
      }
    },
    clearDecryptedFolderDirectory: async () => {
      try {
        await sendMessage("send", "clear-decrypted-folder-directory");
      } catch (error) {
        sendLog(
          `Error clearing decrypted folder directory: ` +
            (error as Error).message,
          "error",
        );
      }
    },
    askPath: async () => {
      try {
        const result = await sendMessage("invoke", "ask-path");
        return result;
      } catch (error) {
        sendLog(`Error asking path: ` + (error as Error).message, "error");
        return null;
      }
    },
    zipFolder: async (
      ...args: ChannelsIpcRenderer["zip-folder"]["functionArgs"]
    ) => {
      try {
        ipcRenderer.on("zip-folder-data", (_event, progress, error) => {
          if (error) args[4]?.(error);
          if (progress)
            args[3]?.(progress.number, progress.filename, progress.fileCount);
        });
        const result = await sendMessage(
          "invoke",
          "zip-folder",
          args[0],
          args[1],
          args[2],
          undefined,
          undefined,
        );
        return result;
      } catch (error) {
        sendLog(`Error zipping folder: ` + (error as Error).message, "error");
        return "";
      }
    },
    deleteFolderVault: async (folderId: string) => {
      try {
        await sendMessage("invoke", "delete-folder", folderId);
      } catch (error) {
        sendLog(
          `Error deleting folder vault: ` + (error as Error).message,
          "error",
        );
      }
    },
    renameFolderVault: async (oldFolderId: string, newFolderId: string) => {
      try {
        await sendMessage("invoke", "rename-folder", oldFolderId, newFolderId);
      } catch (error) {
        sendLog(
          `Error renaming folder vault: ` + (error as Error).message,
          "error",
        );
      }
    },
  },
};

Object.entries(contextBridgeType).forEach(([key, value]) => {
  contextBridge.exposeInMainWorld(key, value);
});
