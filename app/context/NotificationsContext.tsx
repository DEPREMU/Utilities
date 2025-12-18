import React, {
  useRef,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
  createContext,
} from "react";
import {
  Notification,
  Notifications as NotificationsType,
  EventNativeModule,
  ReasonNotification,
  NotificationAction,
} from "@types";
import {
  logError,
  stringifyData,
  loadDataStorage,
  saveDataStorage,
  getNotifications,
  isLocationEnabled,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import { useModal } from "./ModalContext";
import windowModule from "@/utils/modules/WindowModule";
import * as Location from "expo-location";
import { useLanguage } from "./LanguageContext";
import BackgroundModule from "@/utils/modules/BackgroundModule";
import { useBackground } from "./BackgroundContext";
import { useUserContext } from "./UserContext";
import * as Notifications from "expo-notifications";
import NotificationModule from "@/utils/modules/NotificationModule";
import { navigateReplace } from "@/navigation/navigationRef";
import NativeFunctionsModule from "@/utils/modules/NativeFunctionsModule";
import { useDeviceInformation } from "./DeviceInformationContext";
import { DeviceEventEmitter, AppState, Platform } from "react-native";

type SendNotification = (
  notification: Omit<Notification, "id" | "timestamp">,
) => Promise<string | undefined>;

interface NotificationsContextType {
  sendNotificationRef: React.RefObject<SendNotification>;
  removeNotification: (
    id: number,
    reasonNotification: ReasonNotification,
  ) => void;
  notifications?: NotificationsType | null;
  setNotifications: React.Dispatch<
    React.SetStateAction<NotificationsType | null>
  >;
}

const NotificationsContext = createContext<
  NotificationsContextType | undefined
>(undefined);

interface NotificationsProviderProps {
  children: ReactNode;
}

export const NotificationsProvider: React.FC<NotificationsProviderProps> = ({
  children,
}) => {
  const { deviceInfo } = useDeviceInformation();
  const { t, language } = useLanguage();
  const { openSnackBar } = useModal();
  const { sessionToken, userData } = useUserContext();
  const { hasInternet, initIntervalTimeouts, deleteIntervalTimeout } =
    useBackground();

  const notificationsFromStorage = useRef<NotificationsType | null>(null);
  const [notifications, setNotifications] = useState<NotificationsType | null>(
    null,
  );
  const prevHasInternet = useRef<boolean | null>(null);

  const sendNotification = useCallback(
    async (notification: Omit<Notification, "id" | "timestamp">) => {
      const notifications = await getNotifications();

      try {
        if (
          notification.reasonNotification !== "streamers" &&
          notifications.paused[notification.reasonNotification]?.isPaused
        ) {
          const timePaused =
            notifications.paused[notification.reasonNotification]?.timePaused;
          if (Date.now() < timePaused) return Promise.resolve("");

          const newNotifications = { ...notifications };
          newNotifications.paused[notification.reasonNotification] = {
            isPaused: false,
            timePaused: -1,
          };

          await saveDataStorage("NOTIFICATIONS", newNotifications);
          setNotifications(newNotifications);
          notificationsFromStorage.current = newNotifications;
        }
      } catch (error) {
        logError("Error checking paused notifications", error);
      }

      if (AppState.currentState === "active") {
        openSnackBar(
          [notification.title, notification.message].join("\n"),
          8000,
        );
        return Promise.resolve("");
      }
      if (Platform.OS === "web") {
        windowModule.sendNotification({
          body: notification.message,
          title: notification.title,
          actions: notification.actions?.map((action) => ({
            type: "button",
            text: action.title,
          })),
          closeButtonText: t("close"),
          reasonNotification: notification.reasonNotification,
        });

        return Promise.resolve("");
      }
      if (!notifications?.enabled?.[notification.reasonNotification])
        return Promise.resolve("");

      if (Platform.OS === "android") {
        try {
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

          return String(notificationId);
        } catch (error) {
          logError("Error sending native notification", error);
        }
      }

      return await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: { type: notification.type, ...notification.data },
        },
        trigger: notification.trigger || null,
      });
    },
    [openSnackBar, t],
  );
  const sendNotificationRef = useRef<SendNotification>(sendNotification);

  const removeNotification = useCallback(
    (id: number, reasonNotification: ReasonNotification) => {
      if (Platform.OS === "web") return;

      if (Platform.OS === "android") {
        try {
          NotificationModule.cancelNotification(id, reasonNotification);
        } catch (error) {
          logError("Error canceling native notification", error);
        }
      }

      Notifications.cancelScheduledNotificationAsync(String(id));
    },
    [],
  );

  useEffect(() => {
    getNotifications().then((data) => setNotifications(data ?? null));

    if (Platform.OS !== "android") return;

    const subscription = DeviceEventEmitter.addListener(
      "onNotificationAction",
      async (event: EventNativeModule) => {
        switch (event.actionId) {
          case "dismiss":
            // Handled below
            break;
          case "settings":
            navigateReplace("Settings");
            break;
          case "pause":
            try {
              const getTimeWithReason = (reason: ReasonNotification) => {
                const defaultTimes: Record<ReasonNotification, number> = {
                  cryptos: 30,
                  streamers: 30,
                  downDetector: 15,
                  batteryAlerts: 30,
                  locationEnabled: 30,
                  allNotifications: 60,
                  noInternetConnection: 15,
                };

                return (defaultTimes[reason] || 60) * 60 * 1000;
              };

              if (event.reasonNotification === "streamers") break;
              const notifications = await getNotifications();

              const newNotifications = { ...notifications };
              newNotifications.paused[event.reasonNotification] = {
                isPaused: true,
                timePaused:
                  Date.now() + getTimeWithReason(event.reasonNotification),
              };

              setNotifications(newNotifications);
              await saveDataStorage("NOTIFICATIONS", newNotifications);
              notificationsFromStorage.current = newNotifications;
            } catch (error) {
              logError("Error pausing notifications", error);
            }
            break;
          case "stop":
            {
              if (event.reasonNotification == "streamers") break;

              const notifications = await getNotifications();

              const newNotifications = { ...notifications };
              newNotifications.enabled[event.reasonNotification] = false;

              setNotifications(newNotifications);
              await saveDataStorage("NOTIFICATIONS", newNotifications);
              notificationsFromStorage.current = newNotifications;
            }
            break;
          default:
            break;
        }
        NotificationModule.cancelNotification(
          event.notificationId,
          event.reasonNotification,
        );
      },
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!notifications) return;
    if (!notificationsFromStorage.current) {
      notificationsFromStorage.current = notifications;
      return;
    }
    if (
      stringifyData(notificationsFromStorage.current) ===
      stringifyData(notifications)
    )
      return;

    const saveNewNotifications = async () => {
      try {
        await saveDataStorage("NOTIFICATIONS", notifications);
      } catch (error) {
        logError("Error saving notifications to storage", error);
      }
    };
    saveNewNotifications();
    notificationsFromStorage.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (!deviceInfo?.powerState) return;

    const reasonNotification: ReasonNotification = "batteryAlerts";

    const handleBatteryNotifications = async () => {
      const actions: NotificationAction[] = [
        { actionId: "dismiss", title: t("dismiss"), icon: "delete" },
      ];

      if (await NativeFunctionsModule.checkOverlayPermission()) {
        actions.push({
          actionId: "pause",
          title: t("pause"),
          icon: "pause",
        });
      }
      if (Platform.OS === "android") {
        NotificationModule.cancelPreviousReasonNotification(reasonNotification);
      }

      if (["charging", "full"].includes(deviceInfo?.powerState?.batteryState)) {
        if (deviceInfo.powerState.batteryLevel <= 0.8) return;

        await sendNotificationRef.current({
          title: t("BatteryFullyCharged"),
          message: t("YouCanUnplugYourDevice"),
          type: "info",
          channelId: "batteryAlerts",
          reasonNotification,
          actions,
          overrideNotification: false,
        });
        return;
      } else if (
        deviceInfo?.powerState?.batteryLevel >= 0.3 &&
        ["unplugged", "unknown"].includes(deviceInfo?.powerState?.batteryState)
      )
        return;

      await sendNotificationRef.current({
        title: t("BatteryLow"),
        message: t("YourBatteryIsLow"),
        type: "warning",
        channelId: "batteryAlerts",
        overrideNotification: false,
        reasonNotification,
        actions: [
          ...actions,
          { actionId: "stop", title: t("stop"), icon: "stop" },
        ],
      });
    };

    const id = setTimeoutPolyfill(handleBatteryNotifications, 5000);
    if (Platform.OS === "web")
      windowModule.getNativeData("hasBattery").then((hasBattery) => {
        if (hasBattery) return;
        clearTimeoutPolyfill(id);
      });
    return () => clearTimeoutPolyfill(id);
  }, [deviceInfo?.powerState, t]);

  useEffect(() => {
    sendNotificationRef.current = sendNotification;
    if (Platform.OS === "android")
      NotificationModule.cancelPreviousReasonNotification(
        "noInternetConnection",
      );

    if (prevHasInternet.current === null) {
      prevHasInternet.current = hasInternet;
      return;
    }
    if (hasInternet === prevHasInternet.current) return;

    if (!hasInternet && prevHasInternet.current) {
      sendNotification({
        title: t("NoInternetConnection"),
        message: t("PleaseCheckInternetConnection"),
        type: "error",
        overrideNotification: false,
        channelId: "noInternetConnection",
        reasonNotification: "noInternetConnection",
      });
    } else {
      sendNotification({
        title: t("InternetConnectionRestored"),
        message: t("YouAreBackOnline"),
        type: "success",
        channelId: "noInternetConnection",
        reasonNotification: "noInternetConnection",
        overrideNotification: false,
      });
    }

    if (prevHasInternet.current !== hasInternet)
      prevHasInternet.current = hasInternet;
  }, [hasInternet, sendNotification, t]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const verifyLocation = async () => {
      const { status } = await Location.getBackgroundPermissionsAsync();
      const hasPermission = status === "granted";
      if (!hasPermission) return;

      const locationEnabled = await isLocationEnabled();
      if (!locationEnabled) return;

      sendNotification({
        title: t("LocationServicesEnabled"),
        message: t("LocationServicesEnabledMessage"),
        type: "info",
        channelId: "locationEnabled",
        reasonNotification: "locationEnabled",
        overrideNotification: false,
        actions: [
          {
            actionId: "dismiss",
            title: t("dismiss"),
            icon: "delete",
          },
          {
            actionId: "pause",
            title: t("pause"),
            icon: "pause",
          },
        ],
      });
    };

    initIntervalTimeouts("locationEnabled", {
      fn: verifyLocation,
      type: "interval",
      interval: 60000,
      workWithInternet: false,
      shouldRestartAuto: true,
      shouldStopWhenSuspend: false,
    });

    verifyLocation();

    return () => {
      deleteIntervalTimeout("locationEnabled");
    };
  }, [sendNotification, t, initIntervalTimeouts, deleteIntervalTimeout]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (!sessionToken || !userData?.userId) return;

    const id = setTimeoutPolyfill(
      () =>
        loadDataStorage("DEVICE_ID").then((deviceId) => {
          BackgroundModule?.setUserData(
            sessionToken,
            userData.userId,
            language,
            deviceId,
          );
        }),
      5000,
    );

    return () => clearTimeoutPolyfill(id);
  }, [sessionToken, userData?.userId, language]);

  const value: NotificationsContextType = {
    notifications,
    setNotifications,
    removeNotification,
    sendNotificationRef,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return context;
};
