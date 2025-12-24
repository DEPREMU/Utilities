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
      if (process.env.PROFILE === "development") return;

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
          "error"
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
          key
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
          "error"
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
          "error"
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
      callback: (items: Array<{ id: string; content: string }>) => void
    ) => {
      ipcRenderer.on("clipboard-items-updated", (_event, items) => {
        callback(items);
      });
    },
  },
};

Object.entries(contextBridgeType).forEach(([key, value]) => {
  contextBridge.exposeInMainWorld(key, value);
});
