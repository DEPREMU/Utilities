import { Logger } from "./logger";
import { Notification } from "electron";
import { NotificationElectron, NotificationsSaved } from "@types";

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
    Logger.log(
      `Notification action clicked: ${index}, ${notification.actions?.[index]}`,
    );
    notification.close();
  });

  notification.on("click", () => {
    Logger.log("Notification clicked");
  });

  notification.on("close", () => {
    Logger.log("Notification closed");
  });

  notification.on("show", () => {
    Logger.log("Notification shown");
  });

  notification.on("failed", (error) => {
    Logger.error("Notification failed:", error);
  });

  notification.on("reply", (_, reply) => {
    Logger.log(`Notification reply: ${reply}`);
  });

  notification.show();
  notifications[notif.reasonNotification] = () => notification.close();
};
