import { sendNotification } from "../utils/notifications";
import { Logger } from "../utils/logger";
import { IpcHandlersRecord } from "./types";

export const notificationIpcHandlers: IpcHandlersRecord<"notification.send"> = {
  "notification.send": {
    type: "on",
    func: (_event, notification) => {
      Logger.log("Received notification.send request:", notification);
      sendNotification(notification);
    },
  },
};
