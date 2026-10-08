import {
  getStorageValue,
  saveStorageValue,
  removeStorageValue,
} from "../utils/storage";
import { Logger } from "../utils/logger";
import { IpcHandlersRecord } from "./types";

export const storageIpcHandlers: IpcHandlersRecord<
  "storage.save" | "storage.load" | "storage.remove"
> = {
  "storage.save": {
    type: "handle",
    func: async (_event, key, value) => {
      try {
        Logger.log(`Received storage.save request for key: ${key}`);

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
  "storage.load": {
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
  "storage.remove": {
    type: "handle",
    func: async (_event, key) => {
      Logger.log(`Received storage.remove request for key: ${key}`);
      try {
        return await removeStorageValue(key);
      } catch (error) {
        Logger.error(`Failed to remove data for key: ${key}:`, error);
      }
      return false;
    },
  },
};
