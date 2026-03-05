import { writeLog } from "./logger";
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
    writeLog(
      `Notification action clicked: ${index}, ${notification.actions?.[index]}`,
      "info",
    );
    notification.close();
  });

  notification.on("click", () => {
    writeLog("Notification clicked", "info");
  });

  notification.on("close", () => {
    writeLog("Notification closed", "info");
  });

  notification.on("show", () => {
    writeLog("Notification shown", "info");
  });

  notification.on("failed", (error) => {
    writeLog(`Notification failed: ${error}`, "error");
  });

  notification.on("reply", (_, reply) => {
    writeLog(`Notification reply: ${reply}`, "info");
  });

  notification.show();
  notifications[notif.reasonNotification] = () => notification.close();
};
