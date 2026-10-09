import { ClipboardBridge, Function, MessagesClipboard, ClipboardItem } from "@types";
import { ipcRenderer } from "electron";
import { sendMessage } from "../utils/sendMessage";
import { sendLog } from "../utils/logger";

const listenersClipboard = new Set<Function<[MessagesClipboard], void>>();

ipcRenderer.on(
  "clipboard-message",
  (_event: unknown, message: MessagesClipboard) => {
    listenersClipboard.forEach((c) => c(message));
  },
);

export const clipboardBridge: ClipboardBridge = {
  read: async () => {
    try {
      return await sendMessage("invoke", "clipboard.read");
    } catch {
      return "";
    }
  },
  set: (text: string) => {
    try {
      sendMessage("send", "clipboard.set", text);
    } catch {
      // ignore
    }
  },
  deleteItem: async (id: string) => {
    try {
      return await sendMessage("invoke", "clipboard.deleteItem", id);
    } catch {
      return false;
    }
  },
  deleteAllItems: async () => {
    try {
      return await sendMessage("invoke", "clipboard.deleteAllItems");
    } catch {
      return false;
    }
  },
  getHistory: async () => {
    try {
      return await sendMessage("invoke", "clipboard.getHistory");
    } catch (error) {
      sendLog("error", "Error getting clipboard history:", error);
      return [];
    }
  },
  setHistory: (items: ClipboardItem[]) => {
    try {
      sendMessage("send", "clipboard.setHistory", items);
    } catch {
      // ignore
    }
  },
  hideWindow: () => {
    try {
      sendMessage("send", "clipboard.hideWindow");
    } catch {
      // ignore
    }
  },
  showWindow: () => {
    try {
      sendMessage("send", "clipboard.showWindow");
    } catch {
      // ignore
    }
  },
  onMessage: (callback: Function<[MessagesClipboard], void>) => {
    listenersClipboard.add(callback);

    return {
      remove: () => {
        listenersClipboard.delete(callback);
      },
    };
  },
  onItemsUpdated: (callback: (items: ClipboardItem[]) => void) => {
    const listener = (_event: unknown, items: ClipboardItem[]) => {
      callback(items);
    };

    ipcRenderer.on("clipboard-items-updated", listener);

    return {
      remove: () => {
        ipcRenderer.removeListener("clipboard-items-updated", listener);
      },
    };
  },
};
