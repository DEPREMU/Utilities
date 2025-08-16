import { Platform } from "react-native";
import { stringifyData } from "./appManagement";
import * as notifications from "expo-notifications";
import { reasonNotification } from "../constants";
import { log, logError, logWarn } from "./debug";
import { loadData, loadDataSecure, saveData } from "./storageManagement";
import { Notifications, ScreensAvailable, ReasonNotification } from "@types";

/**
 * Initializes the notifications storage with default values.
 * This function ensures that the notifications storage is set up correctly
 * before any notifications are scheduled or managed.
 */
export const initializeNotificationsStorage = async () => {
  const notificationsData = await loadData<Notifications>("@notifications");
  const dataNotifications = {} as Notifications["data"];
  const enabledNotifications = {} as Notifications["enabled"];
  const intervalsNotifications = {} as Notifications["intervals"];
  reasonNotification.forEach((reason) => {
    dataNotifications[reason] = null;
    enabledNotifications[reason] = false;
    intervalsNotifications[reason] = null;
    if (reason === "cryptos") intervalsNotifications[reason] = 1000 * 60 * 10;
  });

  if (!notificationsData || !notificationsData.enabled.allNotifications) {
    const { status } = await notifications.getPermissionsAsync();
    if (status !== notifications.PermissionStatus.GRANTED)
      await notifications.requestPermissionsAsync();

    const { status: newStatus } = await notifications.getPermissionsAsync();
    if (newStatus !== notifications.PermissionStatus.GRANTED) {
      await saveData<Notifications>("@notifications", {
        enabled: { ...enabledNotifications, allNotifications: false },
        data: dataNotifications,
        intervals: intervalsNotifications,
      });
      return;
    }

    await saveData<Notifications>("@notifications", {
      enabled: { ...enabledNotifications, allNotifications: true },
      data: dataNotifications,
      intervals: intervalsNotifications,
    });
  }

  const lenNotificationsSaved = Object.keys(notificationsData).length;
  if (lenNotificationsSaved === reasonNotification.length) return;

  notificationsData.data = { ...dataNotifications };
  notificationsData.enabled = {
    ...enabledNotifications,
    allNotifications: true,
  };

  await saveData<Notifications>("@notifications", notificationsData);
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
  const { status } = await notifications.getPermissionsAsync();
  const notificationsData = await loadData<Notifications>("@notifications");
  if (!notificationsData) await initializeNotificationsStorage();

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
      await saveData("@notifications", stringifyData(notificationsData));
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
      loadData<Notifications>("@notifications"),
      loadDataSecure<number | null>("_sessionExpiry"),
    ]);
    if (
      !notificationsData.enabled.allNotifications ||
      !notificationsData.enabled[reason] ||
      sessionExpiry === null
    )
      return;

    await handleCancelNotification(notificationsData, reason);

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

    await saveData("@notifications", JSON.stringify(notificationsData));
  } catch (error) {
    logError("Error sending notification:", error);
  }
};

export interface NotificationData {
  screen?: ScreensAvailable;
  [key: string]: unknown;
}

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
