import { ALL_KEYS_STORAGE_TYPE } from "@common";
import { StorageBridge } from "@types";
import { sendMessage } from "../utils/sendMessage";
import { sendLog } from "../utils/logger";

export const storageBridge: StorageBridge = {
  save: async <T extends ALL_KEYS_STORAGE_TYPE>(key: T, value: string) => {
    try {
      return await sendMessage("invoke", "storage.save", key, value);
    } catch (error) {
      sendLog("error", `Error saving data for key ${key}:`, error);
      return { success: false };
    }
  },
  load: async <T extends ALL_KEYS_STORAGE_TYPE>(key: T) => {
    try {
      const result = await sendMessage<T, "storage.load">(
        "invoke",
        "storage.load",
        key,
      );
      return result;
    } catch (error) {
      sendLog("error", `Error loading data for key ${key}: `, error);
      return null;
    }
  },
  remove: async <T extends ALL_KEYS_STORAGE_TYPE>(key: T) => {
    try {
      return await sendMessage<T, "storage.remove">(
        "invoke",
        "storage.remove",
        key,
      );
    } catch (error) {
      sendLog("error", `Error removing data for key ${key}:`, error);
      return false;
    }
  },
};
