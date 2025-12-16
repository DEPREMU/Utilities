import {
  ChannelsId,
  Notifications,
  ScreensAvailable,
  ReasonNotification,
} from "@types";
import { log } from "./debug";
import * as notifications from "expo-notifications";
import NotificationModule from "../modules/NotificationModule";
import { Platform, Falsy } from "react-native";
import { reasonNotification } from "../constants";
import { getNotifications, stringifyData } from "./appManagement";
import { loadDataStorage, saveDataStorage } from "./storageManagement";

export interface NotificationData {
  screen?: ScreensAvailable;
  [key: string]: unknown;
}

/**
 * Checks if the notifications data is already declared.
 * This function checks if the notifications data has been initialized
 * and contains the necessary structure.
 *
 * @param {Notifications} notificationsData - The notifications data to check.
 * @returns {boolean} - Returns true if notifications are already initialized, otherwise false.
 */
export const isNotificationsAlreadyInitialized = (
  notificationsData: Notifications | Falsy,
): notificationsData is Notifications => {
  if (!notificationsData) return false;

  const { enabled, intervals } = notificationsData;
  const keysEnabled = Object.keys(enabled || {});
  const keysIntervals = Object.keys(intervals || {});

  return (
    stringifyData(keysEnabled) === stringifyData(reasonNotification) &&
    stringifyData(keysIntervals) === stringifyData(reasonNotification)
  );
};

/**
 * Initializes the notifications storage with default values.
 * This function ensures that the notifications storage is set up correctly
 * before any notifications are scheduled or managed.
 */
export const initializeNotificationsStorage =
  async (): Promise<Notifications> => {
    let notificationsData = await loadDataStorage("@notifications");

    if (isNotificationsAlreadyInitialized(notificationsData))
      return notificationsData;

    const pausedNotifications = {} as Notifications["paused"];
    const enabledNotifications = {} as Notifications["enabled"];
    const intervalsNotifications = {} as Notifications["intervals"];
    reasonNotification.forEach((reason) => {
      if (reason === "streamers") {
        enabledNotifications[reason] = {};
      } else {
        enabledNotifications[reason] = false;
        pausedNotifications[reason] = { isPaused: false, timePaused: -1 };
      }
      intervalsNotifications[reason] = null;
      if (reason === "cryptos") intervalsNotifications[reason] = 1000 * 60 * 10;
    });

    if (!notificationsData || typeof notificationsData !== "object") {
      const { status } = await notifications.requestPermissionsAsync();
      if (status !== notifications.PermissionStatus.GRANTED) {
        notificationsData = {
          enabled: { ...enabledNotifications, allNotifications: false },
          paused: pausedNotifications,
          intervals: intervalsNotifications,
        };
        saveDataStorage("@notifications", notificationsData);
        return notificationsData;
      }

      notificationsData = {
        enabled: { ...enabledNotifications, allNotifications: true },
        paused: pausedNotifications,
        intervals: intervalsNotifications,
      };
      saveDataStorage("@notifications", notificationsData);
      return notificationsData;
    }

    const newNotifications: Notifications = {
      enabled: { ...enabledNotifications, allNotifications: true },
      paused: { ...pausedNotifications },
      intervals: { ...intervalsNotifications },
    };

    saveDataStorage("@notifications", newNotifications);
    return newNotifications;
  };

/**
 * Checks if the application has permission to send push notifications.
 *
 * This function first checks the current notification permission status.
 * If permission is not granted, it requests permission from the user.
 * Returns `true` if permission is granted, otherwise `false`.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if push notification permission is granted, otherwise `false`.
 */
export const hasPushNotifications = async (): Promise<boolean> => {
  const promise = await Promise.all([
    notifications.requestPermissionsAsync(),
    getNotifications(),
  ]);
  const { status } = promise[0];
  let notificationsData = promise[1];
  if (!notificationsData)
    notificationsData = await initializeNotificationsStorage();

  if (status === notifications.PermissionStatus.GRANTED)
    return notificationsData.enabled.allNotifications;

  const { status: newStatus } = await notifications.requestPermissionsAsync();
  if (newStatus !== notifications.PermissionStatus.GRANTED) return false;

  return notificationsData.enabled.allNotifications;
};

/**
 * Sets up notification handlers for when notifications are received and tapped
 */
export const setupNotificationHandlers = (
  navigateToScreen: (screen: ScreensAvailable) => void,
) => {
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowList: true,
      shouldShowBanner: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const notificationListener =
    notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content
        .data as NotificationData;

      if (!data?.screen) return;

      navigateToScreen(data.screen);
    });

  const foregroundListener = notifications.addNotificationReceivedListener(
    (notification) => {
      log("Notification received in foreground:", notification.request.content);
      const data = notification.request?.content?.data as NotificationData;
      if (!data) return;
      if (data.reason)
        NotificationModule.cancelPreviousReasonNotification?.(
          data.reason as ReasonNotification,
        );
    },
  );

  return () => {
    foregroundListener.remove();
    notificationListener.remove();
  };
};

export const configureNotificationChannel = async () => {
  if (Platform.OS !== "android") return;

  const channelIdCryptos: ChannelsId = "cryptos";
  const channelIdDefault: ChannelsId = "default";
  const channelIdBattery: ChannelsId = "batteryAlerts";
  const channelIdLocation: ChannelsId = "locationEnabled";
  const channelIdStreamers: ChannelsId = "streamers";
  const channelIdNoInternet: ChannelsId = "noInternetConnection";
  const channelIdForegroundService: ChannelsId = "ForegroundServiceChannel";
  await Promise.all([
    notifications.setNotificationChannelAsync(channelIdStreamers, {
      name: "Streamers",
      importance: notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#8400ff7c",
    }),
    notifications.setNotificationChannelAsync(channelIdCryptos, {
      name: "Cryptos",
      importance: notifications.AndroidImportance.MAX,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250, 250, 250, 100],
      lightColor: "#00f7ff7c",
    }),
    notifications.setNotificationChannelAsync(channelIdDefault, {
      name: "Default",
      importance: notifications.AndroidImportance.DEFAULT,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ffffff",
    }),
    notifications.setNotificationChannelAsync(channelIdLocation, {
      name: "Location Alerts",
      importance: notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ff0000",
    }),
    notifications.setNotificationChannelAsync(channelIdBattery, {
      name: "Battery Alerts",
      importance: notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#00ff00",
    }),
    notifications.setNotificationChannelAsync(channelIdNoInternet, {
      name: "No Internet Connection",
      importance: notifications.AndroidImportance.HIGH,
      sound: "default",
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ffff00",
    }),
    notifications.setNotificationChannelAsync(channelIdForegroundService, {
      name: "Foreground Service",
      importance: notifications.AndroidImportance.DEFAULT,
      sound: null,
      vibrationPattern: null,
    }),
  ]);
};
