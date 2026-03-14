import {
  windowModule,
  NotificationModule,
  NativeFunctionsModule,
} from "@modules";
import {
  ChannelsId,
  Notification,
  Notifications,
  ScreensAvailable,
  ReasonNotification,
} from "@types";
import { logger } from "../functions";
import { tTyped } from "../translates";
import { modalRef } from "@refs";
import { cloneDeep } from "lodash";
import { REPLACERS } from "../TOP_LEVEL";
import { navigation } from "./navigation";
import * as DeviceInfo from "react-native-device-info";
import * as notifications from "expo-notifications";
import { AppState, Falsy } from "react-native";
import { storageManagement } from "../services/storage";
import { deviceInfo, EventsDeviceInfo } from "./deviceInfo";
import { reasonNotification, objByReasonNotification } from "@common";

export interface NotificationData {
  screen?: ScreensAvailable;
  [key: string]: unknown;
}

export type SendNotification = (
  notification: Omit<Notification, "id" | "timestamp">,
) => Promise<string | void>;

export type RemoveNotification = (
  id: number,
  reasonNotification: ReasonNotification,
) => void;

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

  const keys = Object.keys(notificationsData) as Array<keyof Notifications>;

  const countValuesKeys = keys
    .map((key) => Object.keys(notificationsData[key]))
    .map((subKeys) => subKeys.length)
    .reduce((a, b) => a + b, 0);
  const countValuesExpected =
    Object.keys(objByReasonNotification).length * reasonNotification.length;

  return (
    countValuesKeys >= countValuesExpected &&
    reasonNotification.every((reason) => keys.includes(reason))
  );
};

/**
 * Initializes the notifications storage with default values.
 * This function ensures that the notifications storage is set up correctly
 * before any notifications are scheduled or managed.
 */
export const initializeNotificationsStorage =
  async (): Promise<Notifications> => {
    await storageManagement.waitUntilLoaded();
    const notificationsData = storageManagement.get("NOTIFICATIONS");

    if (isNotificationsAlreadyInitialized(notificationsData))
      return notificationsData;

    const newNotifications = reasonNotification.reduce((acc, reason) => {
      acc[reason] = cloneDeep(objByReasonNotification) as never;
      switch (reason) {
        case "downDetector":
          acc[reason].enabled = true;
          break;
        case "streamers":
          acc[reason].streamersList = [];
          break;
        case "cryptos":
          acc[reason].interval = 1000 * 60 * 10;
          break;
        default:
          break;
      }

      return acc;
    }, {} as Notifications);

    const { status } = await notifications.requestPermissionsAsync();
    newNotifications.allNotifications.enabled =
      status === notifications.PermissionStatus.GRANTED;

    storageManagement.save("NOTIFICATIONS", newNotifications);
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
  const { status } = await notifications.requestPermissionsAsync();
  const notificationsData =
    notificationsManager.getNotification("allNotifications");

  if (status === notifications.PermissionStatus.GRANTED)
    return notificationsData.enabled;

  const { status: newStatus } = await notifications.requestPermissionsAsync();
  if (newStatus !== notifications.PermissionStatus.GRANTED) return false;

  return notificationsData.enabled;
};

/**
 * Sets up notification handlers for when notifications are received and tapped
 */
export const setupNotificationHandlers = () => {
  if (REPLACERS.isWeb) return () => {};

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

      navigation.replace(data.screen);
    });

  const foregroundListener = notifications.addNotificationReceivedListener(
    (notification) => {
      logger.log(
        "Notification received in foreground:",
        notification.request.content,
      );
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

const configureNotificationChannel = async () => {
  if (REPLACERS.isWeb) return;

  const channels: Record<ChannelsId, notifications.NotificationChannelInput> = {
    updateAvailable: {
      name: tTyped("updateAvailable"),
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#00ff00",
    },
    cryptos: {
      name: tTyped("cryptos"),
      importance: notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250, 250, 250, 100],
      lightColor: "#00f7ff7c",
    },
    streamers: {
      name: tTyped("streamers"),
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#8400ff7c",
    },
    default: {
      name: tTyped("default"),
      importance: notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ffffff",
    },
    locationEnabled: {
      name: tTyped("locationEnabled"),
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ff0000",
    },
    batteryAlerts: {
      name: tTyped("batteryAlerts"),
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#00ff00",
    },
    noInternetConnection: {
      name: tTyped("noInternetConnection"),
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ffff00",
    },
    ForegroundServiceChannel: {
      name: tTyped("foregroundService"),
      importance: notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
    },
    downDetector: {
      name: tTyped("downDetector"),
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ff00ff",
    },
    loggedInStatusChannel: {
      name: tTyped("loggedInStatusChannel"),
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#00ffff",
    },
    timeToDownload: {
      name: tTyped("timeToDownload"),
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250, 100],
      lightColor: "#ffa500",
    },
    recorderNotification: {
      name: tTyped("recorderNotification"),
      importance: notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: null,
    },
  };

  await Promise.all(
    Object.entries(channels).map(([channelId, channelOptions]) =>
      notifications.setNotificationChannelAsync(channelId, channelOptions),
    ),
  );
};
configureNotificationChannel();

export const getListenerNameDeviceInfo = (reason: ReasonNotification) => {
  switch (reason) {
    case "locationEnabled":
      return EventsDeviceInfo.verifyLocation;
    case "batteryAlerts":
      return EventsDeviceInfo.batteryAlerts;
    case "noInternetConnection":
      return EventsDeviceInfo.hasInternetChange;
    default:
      return null;
  }
};

class NotificationsManager {
  #initialized = false;
  #initPromise: Promise<void> | null = null;

  #notifications: Notifications = null as unknown as Notifications;

  public waitUntilLoaded = async (): Promise<void> => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;

    this.#initPromise = this.init();
    return this.#initPromise;
  };

  public getNotifications = (): Notifications => {
    return cloneDeep(this.#notifications);
  };

  public getNotification = <T extends ReasonNotification>(
    reason: T,
  ): Notifications[T] => {
    const notificationsData = this.#notifications;
    return cloneDeep(notificationsData[reason]);
  };

  public editNotification = <T extends ReasonNotification>(
    reason: T,
    data:
      | Notifications[T]
      | ((prev: Notifications[T]) => Partial<Notifications[T]>),
    callback?: (
      notifications: Notifications,
      notification: Notifications[T],
    ) => void,
  ): void => {
    const notificationsData = this.#notifications;

    const prevData = notificationsData[reason];
    const newData = typeof data === "function" ? data(prevData) : data;

    this.#notifications = {
      ...notificationsData,
      [reason]: {
        ...prevData,
        ...newData,
      },
    };

    storageManagement.save("NOTIFICATIONS", this.#notifications);

    if (callback) {
      const clone = cloneDeep(this.#notifications);
      callback(clone, clone[reason]);
    }
  };

  public editNotifications = async (
    data:
      | Partial<Notifications>
      | ((prev: Notifications) => Partial<Notifications>),
  ): Promise<void> => {
    const notificationsData = this.#notifications;

    const newData =
      typeof data === "function" ? data(notificationsData) : cloneDeep(data);

    this.#notifications = {
      ...notificationsData,
      ...newData,
    };

    storageManagement.save("NOTIFICATIONS", this.#notifications);
  };

  public removeNotification: RemoveNotification = async (
    id,
    reasonNotification,
  ) => {
    if (REPLACERS.isWeb) return;

    NotificationModule.cancelNotification(id, reasonNotification);
  };

  public sendNotification: SendNotification = async (notification) => {
    try {
      await storageManagement.waitUntilLoaded();
      const localNotification = this.getNotification(
        notification.reasonNotification,
      );

      if (!localNotification.enabled) return;

      if (
        notification.reasonNotification !== "streamers" &&
        localNotification?.paused
      ) {
        const timePaused = localNotification.paused.timePaused || 0;
        if (Date.now() < timePaused) return;

        this.editNotification(notification.reasonNotification, (prev) => {
          return {
            ...prev,
            paused: {
              isPaused: false,
              timePaused: -1,
            },
          };
        });
      }

      if (AppState.currentState === "active") {
        if (
          storageManagement.hasUI &&
          !localNotification.behavior.onlyWhenScreenOff &&
          !localNotification.behavior.onlyWhenAppInBackground &&
          (REPLACERS.isNative
            ? !localNotification.behavior.onlyWhenConnectedToPower ||
              (await DeviceInfo.isBatteryCharging())
            : true)
        )
          modalRef.openSnackBar?.(
            [notification.title, notification.message].join("\n"),
            8000,
          );

        return;
      }

      if (localNotification.behavior.onlyDuringSpecificHours.enabled) {
        const currentHour = new Date().getHours();
        const { startHour, endHour } =
          localNotification.behavior.onlyDuringSpecificHours;

        if (currentHour < startHour || currentHour >= endHour) return;
      }

      if (REPLACERS.isWeb) {
        windowModule.sendNotification({
          body: notification.message,
          title: notification.title,
          actions: notification.actions?.map((action) => ({
            type: "button",
            text: action.title,
          })),
          closeButtonText: tTyped("common.close"),
          reasonNotification: notification.reasonNotification,
        });

        return;
      } else {
        try {
          const isDND = await NativeFunctionsModule.isDoNotDisturbEnabled();

          const { deviceInfo } = await import("@utils");
          await deviceInfo.waitUntilLoaded();

          if (
            localNotification.behavior.onlyWhenScreenOff &&
            deviceInfo.statePhone === "resumed"
          )
            return;

          if (localNotification.behavior.onlyWhenConnectedToPower) {
            const isCharging = await DeviceInfo.isBatteryCharging();
            if (!isCharging) return;
          }

          if (localNotification.behavior.onlyWhenNotInDoNotDisturb && isDND)
            return;

          if (localNotification.behavior.bypassDoNotDisturb && isDND)
            await NativeFunctionsModule.disableDoNotDisturb();

          const notificationId = Math.floor(Math.random() * 1000000);

          await NotificationModule.sendNotification(
            notificationId,
            notification.title,
            notification.message,
            notification.channelId,
            notification.reasonNotification,
            true,
            notification.data || {},
            notification.actions || null,
          );

          if (isDND && localNotification.behavior.bypassDoNotDisturb) {
            const { setTimeoutPolyfill } = await import("@utils");
            setTimeoutPolyfill(NativeFunctionsModule.enableDoNotDisturb, 1500);
          }

          return String(notificationId);
        } catch (error) {
          logger.error("Error sending native notification", error);
        }
      }

      return await notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: { type: notification.type, ...notification.data },
        },
        trigger: notification.trigger || null,
      });
    } catch (error) {
      logger.error(
        "NOTIFICATIONS",
        "Error checking paused notifications",
        error,
      );
    }
  };

  public init = async () => {
    const load = async () => {
      const notificationsData = await initializeNotificationsStorage();
      this.#initialized = true;
      this.#notifications = notificationsData;
    };

    this.#initPromise = load();

    return this.#initPromise;
  };

  public toggleNotification = async <T extends ReasonNotification>(
    reason: T,
  ) => {
    await deviceInfo.waitUntilLoaded();

    const data = this.getNotification(reason);
    data.enabled = !data.enabled;
    this.editNotification(reason, data);

    const event = getListenerNameDeviceInfo(reason);
    if (!event) return;

    if (data.enabled) await deviceInfo.initListener(event);
    else deviceInfo.removeListener(event);
  };

  constructor() {
    this.init();
  }
}

export const notificationsManager = new NotificationsManager();
