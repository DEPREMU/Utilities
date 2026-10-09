import {
  getStorageValue,
  saveStorageValue,
  removeStorageValue,
} from "../utils/storage";
import { Logger } from "../utils/logger";
import { IpcHandlersRecord } from "./types";

const logger = new Logger("IPC-Storage");

export const storageIpcHandlers: IpcHandlersRecord<
  "storage.save" | "storage.load" | "storage.remove"
> = {
  "storage.save": {
    type: "handle",
    func: async (_event, key, value) => {
      try {
        logger.log(`Received storage.save request for key: ${key}`);

        const success = await saveStorageValue(key, value);
        if (success) logger.log(`Data saved successfully for key: ${key}`);
        else logger.error(`Failed to save data for key: ${key}`);

        return { success };
      } catch (error) {
        logger.error(`Error saving data for key ${key}:`, error);
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
        logger.error(`Error loading data for key ${key}:`, error);
        return null;
      }
    },
  },
  "storage.remove": {
    type: "handle",
    func: async (_event, key) => {
      logger.log(`Received storage.remove request for key: ${key}`);
      try {
        return await removeStorageValue(key);
      } catch (error) {
        logger.error(`Failed to remove data for key: ${key}:`, error);
      }
      return false;
    },
  },
};
