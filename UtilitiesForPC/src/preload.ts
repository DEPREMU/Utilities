import {
  ALL_KEYS_STORAGE,
  ContextBridgeType,
  LanguagesSupported,
  ChannelsIpcRenderer,
} from "@types";
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
  T extends ALL_KEYS_STORAGE,
  K extends keyof ChannelsIpcRenderer<T> = keyof ChannelsIpcRenderer<T>,
  V extends ChannelsIpcRenderer<T>[K]["functionArgs"] = ChannelsIpcRenderer<T>[K]["functionArgs"]
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
        clipboard.writeText(text);
      } catch {
        // ignore
      }
    },
    notifyLoginStatus: (isLoggedIn: boolean) => {
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        idleTimeout = null;
        ipcRenderer.send("user-login-status", isLoggedIn);
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
  },
};

Object.entries(contextBridgeType).forEach(([key, value]) => {
  contextBridge.exposeInMainWorld(key, value);
});
