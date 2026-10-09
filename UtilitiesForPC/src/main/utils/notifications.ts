import { Logger } from "./logger";
import { Notification } from "electron";
import { NotificationElectron, NotificationsSaved } from "@types";

const logger = new Logger("Notifications");

const notifications: NotificationsSaved = {
  cryptos: null,
  streamers: null,
  downDetector: null,
  batteryAlerts: null,
  timeToDownload: null,
  locationEnabled: null,
  updateAvailable: null,
  allNotifications: null,
  noInternetConnection: null,
  recorderNotification: null,
  loggedInStatusChannel: null,
};

export const sendNotification = (notif: NotificationElectron) => {
  try {
    const prevNotification = notifications[notif.reasonNotification];
    prevNotification?.();
    notifications[notif.reasonNotification] = null;
  } catch {
    // Ignore
  }

  const notification = new Notification(notif);

  notification.on("action", (_, index) => {
    logger.log(
      `Notification action clicked: ${index}, ${notification.actions?.[index]}`,
    );
    notification.close();
  });

  notification.on("click", () => {
    logger.log("Notification clicked");
  });

  notification.on("close", () => {
    logger.log("Notification closed");
  });

  notification.on("show", () => {
    logger.log("Notification shown");
  });

  notification.on("failed", (error) => {
    logger.error("Notification failed:", error);
  });

  notification.on("reply", (_, reply) => {
    logger.log(`Notification reply: ${reply}`);
  });

  notification.show();
  notifications[notif.reasonNotification] = () => notification.close();
};
