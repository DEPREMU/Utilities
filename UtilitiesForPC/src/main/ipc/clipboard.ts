import { clipboard } from "electron";
import { createWindowClipboard } from "../utils/clipboard";
import dataApp from "../utils/variables";
import { Logger } from "../utils/logger";
import { Helper } from "@common";
import { MessagesClipboard } from "@types";
import { IpcHandlersRecord } from "./types";

export const clipboardIpcHandlers: IpcHandlersRecord<
  | "clipboard.read"
  | "clipboard.set"
  | "clipboard.deleteItem"
  | "clipboard.deleteAllItems"
  | "clipboard.getHistory"
  | "clipboard.setHistory"
  | "clipboard.hideWindow"
  | "clipboard.showWindow"
> = {
  "clipboard.read": {
    type: "handle",
    func: async () => {
      return clipboard.readText();
    },
  },
  "clipboard.set": {
    type: "on",
    func: (_event, text) => {
      Logger.log(
        `Received set-clipboard request with text length: ${text.length}`,
      );
      clipboard.writeText(text);
    },
  },
  "clipboard.deleteItem": {
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
  "clipboard.deleteAllItems": {
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
  "clipboard.getHistory": {
    type: "handle",
    func: async () => {
      Logger.log("Received get-clipboard-history request");
      const clipboardItems = dataApp.getValue("clipboardHistory") || [];
      return clipboardItems;
    },
  },
  "clipboard.setHistory": {
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
  "clipboard.hideWindow": {
    type: "on",
    func: (_event) => {
      Logger.log("Received hide-clipboard-window request");
      const clipboardWindow = dataApp.getValue("clipboardWindow");
      if (!clipboardWindow || clipboardWindow.isDestroyed()) return;

      clipboardWindow.hide();
    },
  },
  "clipboard.showWindow": {
    type: "on",
    func: (_event) => {
      Logger.log("Received show-clipboard-window request");
      const clipboardWindow = dataApp.getValue("clipboardWindow");

      if (clipboardWindow && !clipboardWindow.isDestroyed()) {
        clipboardWindow.show();
        clipboardWindow.focus();
      } else createWindowClipboard(true);
    },
  },
};
