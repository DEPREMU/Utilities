import { NotificationBridge, NotificationElectron } from "@types";
import { sendMessage } from "../utils/sendMessage";

export const notificationBridge: NotificationBridge = {
  send: (notification: NotificationElectron): void => {
    sendMessage("send", "notification.send", notification);
  },
};
