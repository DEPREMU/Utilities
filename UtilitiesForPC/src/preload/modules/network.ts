import { NetworkBridge } from "@types";
import { sendMessage } from "../utils/sendMessage";
import { sendLog } from "../utils/logger";

export const networkBridge: NetworkBridge = {
  hasInternetConnection: async (): Promise<boolean> => {
    try {
      return await sendMessage("invoke", "network.hasInternetConnection");
    } catch (error) {
      sendLog("error", "Error checking internet connection:", error);
      return false;
    }
  },
};
