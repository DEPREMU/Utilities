import {
  ChannelsId,
  Notifications,
  ScreensAvailable,
  ReasonNotification,
} from "@types";
import { Platform } from "react-native";
import * as notifications from "expo-notifications";
import { reasonNotification } from "../constants";
import { log, logError, logWarn } from "./debug";
import { getNotifications, stringifyData } from "./appManagement";
import { loadData, loadDataSecure, saveData } from "./storageManagement";

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
  notificationsData: Notifications | null,
): boolean => {
  if (!notificationsData) return false;

  const { data, enabled, intervals } = notificationsData;
  const keysData = Object.keys(data || {});
  const keysEnabled = Object.keys(enabled || {});
  const keysIntervals = Object.keys(intervals || {});

  return (
    stringifyData(keysData) === stringifyData(reasonNotification) &&
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
    let notificationsData = await loadData<Notifications>("@notifications");
    if (isNotificationsAlreadyInitialized(notificationsData))
      return notificationsData;

    const dataNotifications = {} as Notifications["data"];
    const enabledNotifications = {} as Notifications["enabled"];
    const intervalsNotifications = {} as Notifications["intervals"];
    reasonNotification.forEach((reason) => {
      if (reason === "streamers") enabledNotifications[reason] = {};
      else enabledNotifications[reason] = false;
      dataNotifications[reason] = null;
      intervalsNotifications[reason] = null;
      if (reason === "cryptos") intervalsNotifications[reason] = 1000 * 60 * 10;
    });

    if (!notificationsData || !notificationsData.enabled.allNotifications) {
      const { status } = await notifications.requestPermissionsAsync();
      if (status !== notifications.PermissionStatus.GRANTED) {
        notificationsData = {
          enabled: { ...enabledNotifications, allNotifications: false },
          data: dataNotifications,
          intervals: intervalsNotifications,
        };
        saveData<Notifications>("@notifications", notificationsData);
        return notificationsData;
      }

      notificationsData = {
        enabled: { ...enabledNotifications, allNotifications: true },
        data: dataNotifications,
        intervals: intervalsNotifications,
      };
      saveData<Notifications>("@notifications", notificationsData);
      return notificationsData;
    }

    notificationsData.data = { ...dataNotifications };
    notificationsData.enabled = {
      ...enabledNotifications,
      allNotifications: true,
    };

    saveData<Notifications>("@notifications", notificationsData);
    return notificationsData;
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
 * Cancels a notification based on the reason provided.
 *
 * This function loads existing notifications from storage, checks if a notification
 * with the specified reason exists, and cancels it if found.
 *
 * @param {Notifications} notificationsData - The current notifications data.
 * @param {string} reason - The reason for the notification to be canceled.
 */
export const handleCancelNotification = async (
  notificationsData: Notifications,
  reason: ReasonNotification,
  saveNewNotifications = false,
) => {
  const idNotification = notificationsData.data[reason]?.id;
  if (!idNotification) return;
  try {
    await notifications.cancelScheduledNotificationAsync(idNotification);
    if (saveNewNotifications) {
      notificationsData.data[reason] = null;
      saveData("@notifications", notificationsData);
    }
    log(`Notification with reason "${reason}" canceled successfully.`);
  } catch (error) {
    logError(`Error canceling notification with reason "${reason}":`, error);
  }
};

export const sendNotification = async (
  reason: ReasonNotification,
  title: string,
  body: string | null,
  trigger: notifications.NotificationTriggerInput | null = null,
  screen: ScreensAvailable = "Home",
  data?: Record<string, unknown>,
): Promise<void> => {
  try {
    if (Platform.OS === "web") {
      logWarn("Notifications are not supported on web platform");
      return;
    }

    const [notificationsData, sessionExpiry] = await Promise.all([
      getNotifications(),
      loadDataSecure<number | null>("_sessionExpiry"),
    ]);
    if (
      !notificationsData.enabled.allNotifications ||
      !notificationsData.enabled[reason] ||
      sessionExpiry === null
    )
      return;

    handleCancelNotification(notificationsData, reason);

    const id = await notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          screen,
        },
      },
      trigger,
    });

    notificationsData.data[reason] = {
      id,
      body,
      data,
      title,
      screen,
      trigger,
    };

    saveData("@notifications", stringifyData(notificationsData));
  } catch (error) {
    logError("Error sending notification:", error);
  }
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
  const channelIdStreamers: ChannelsId = "streamers";
  await Promise.all([
    notifications.setNotificationChannelAsync(channelIdStreamers, {
      name: "Streamers",
      importance: notifications.AndroidImportance.DEFAULT,
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
  ]);
};
