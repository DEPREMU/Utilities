import { Logger } from "../utils/logger";
import { sendNotification } from "../utils/notifications";
import { IpcHandlersRecord } from "./types";

const logger = new Logger("IPC-Notification");

export const notificationIpcHandlers: IpcHandlersRecord<"notification.send"> = {
  "notification.send": {
    type: "on",
    func: (_event, notification) => {
      logger.log("Received notification.send request:", notification);
      sendNotification(notification);
    },
  },
};
