import {
  ClipboardItem,
  ContextBridgeType,
  LanguagesSupported,
  ChannelsIpcRenderer,
} from "@types";
import { Timers, ALL_KEYS_STORAGE_TYPE, Helper } from "@common";
import { ipcRenderer, contextBridge, IpcRendererEvent } from "electron";

const sendLog = (level: "log" | "warn" | "error", ...args: unknown[]) => {
  void fetch("http://localhost:3005/log", {
    body: JSON.stringify({
      level,
      message: Helper.getMessage(...args),
    }),
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

let idleTimeout: number | null = null;

const contextBridgeType: ContextBridgeType = {
  UtilitiesForPC: {
    readClipboard: async () => {
      try {
        return await sendMessage("invoke", "read-clipboard");
      } catch {
        return "";
      }
    },
    setClipboard: (text: string) => {
      try {
        sendMessage("send", "set-clipboard", text);
      } catch {
        // ignore
      }
    },
    notifyLoginStatus: (isLoggedIn: boolean) => {
      if (process.env.BUILD_PROFILE === "development") return;

      if (idleTimeout) {
        Timers.clearTimeout(idleTimeout);
        idleTimeout = null;
      }

      idleTimeout = Timers.setTimeout(() => {
        idleTimeout = null;
        sendMessage("send", "user-login-status", isLoggedIn);
      }, 1000);
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
          "error",
          `Error getting native data for key ${args[0]}:`,
          error instanceof Error ? error.message : String(error),
        );
        return "unknown";
      }
    },

    saveData: async (key, value) => {
      try {
        return await sendMessage("invoke", "save-data", key, value);
      } catch (error) {
        sendLog("error", `Error saving data for key ${key}:`, error);
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
        sendLog("error", `Error loading data for key ${key}: `, error);
        return null;
      }
    },

    removeData: async (key) => {
      try {
        const result = await sendMessage("invoke", "remove-data", key);
        return result;
      } catch (error) {
        sendLog("error", `Error removing data for key ${key}:`, error);
        return false;
      }
    },

    isElectronBuild: async () => {
      sendLog("log", "Checking if Electron build...");
      const isElectron = await sendMessage("invoke", "is-electron-build");
      sendLog("log", "isElectronBuild:", isElectron);
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
        sendLog("error", `Error executing command "${command}":`, error);
        return error instanceof Error ? error.message : String(error);
      }
    },
    createPdf: async (request, onProgress) => {
      const progressListener = (_event: IpcRendererEvent, progress: number) => {
        onProgress?.(progress);
      };

      ipcRenderer.on("create-pdf-progress", progressListener);

      try {
        const result = await sendMessage("invoke", "create-pdf", request);
        return result;
      } catch (error) {
        sendLog("error", `Error creating PDF:`, error);
        return null;
      } finally {
        ipcRenderer.removeListener("create-pdf-progress", progressListener);
      }
    },
    getClipboardHistory: async () => {
      try {
        const result = await sendMessage("invoke", "get-clipboard-history");
        return result;
      } catch (error) {
        sendLog("error", "Error getting clipboard history:", error);
        return [];
      }
    },
    setClipboardHistory: (items: ClipboardItem[]) => {
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
        sendLog("error", "Error during authentication:", error);
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
        sendLog("error", "Error copying file to temp:", error);
        return { success: false };
      }
    },
    removeFile: async (uri: string) => {
      try {
        return await sendMessage("invoke", "remove-file-with-uri", uri);
      } catch (error) {
        sendLog("error", "Error removing file from temp:", error);
        return { success: false };
      }
    },
    getSafeFolder: async () => {
      try {
        const directory = await sendMessage("invoke", "get-safe-folder");
        return directory;
      } catch (error) {
        sendLog("error", "Error getting safe folder:", error);
        return "unknown";
      }
    },
    pickFolder: async () => {
      try {
        const result = await sendMessage("invoke", "pick-folder");
        return result;
      } catch (error) {
        sendLog("error", "Error picking folder:", error);
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
        sendLog("error", "Error encrypting vault items:", error);
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
        sendLog("error", "Error loading encrypted files:", error);
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
        sendLog("error", "Error renaming vault item:", error);
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
        sendLog("error", "Error performing action with vault item:", error);
        return { success: false };
      }
    },
    getFileInfo: async (filePath: string) => {
      try {
        const result = await sendMessage("invoke", "get-file-info", filePath);
        return result;
      } catch (error) {
        sendLog("error", `Error getting file info for "${filePath}":`, error);
        return null;
      }
    },
    clearDecryptedFolderDirectory: async () => {
      try {
        await sendMessage("send", "clear-decrypted-folder-directory");
      } catch (error) {
        sendLog("error", "Error clearing decrypted folder directory:", error);
      }
    },
    askPath: async () => {
      try {
        const result = await sendMessage("invoke", "ask-path");
        return result;
      } catch (error) {
        sendLog("error", "Error asking path:", error);
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
        ipcRenderer.removeAllListeners("zip-folder-data");

        return result;
      } catch (error) {
        sendLog("error", "Error zipping folder:", error);
        return "";
      }
    },
    deleteFolderVault: async (folderId: string) => {
      try {
        await sendMessage("invoke", "delete-folder", folderId);
      } catch (error) {
        sendLog("error", "Error deleting folder vault:", error);
      }
    },
    renameFolderVault: async (oldFolderId: string, newFolderId: string) => {
      try {
        await sendMessage("invoke", "rename-folder", oldFolderId, newFolderId);
      } catch (error) {
        sendLog("error", "Error renaming folder vault:", error);
      }
    },
    getExistingVaultFolders: async () => {
      try {
        const result = await sendMessage(
          "invoke",
          "get-existing-vault-folders",
        );
        return result;
      } catch (error) {
        sendLog("error", "Error getting existing vault folders:", error);
        return [];
      }
    },
  },
};

Object.entries(contextBridgeType).forEach(([key, value]) => {
  contextBridge.exposeInMainWorld(key, value);
});
