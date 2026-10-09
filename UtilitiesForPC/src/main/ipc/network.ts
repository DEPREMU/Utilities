import { Network } from "@common";
import { IpcHandlersRecord } from "./types";

export const networkIpcHandlers: IpcHandlersRecord<"network.hasInternetConnection"> = {
  "network.hasInternetConnection": {
    type: "handle",
    func: async () => await Network.isOnline(),
  },
};
