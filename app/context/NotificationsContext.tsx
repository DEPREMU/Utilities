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
  Window,
  Notification,
  Notifications as NotificationsType,
  EventNativeModule,
  ReasonNotification,
  NotificationAction,
  RequestSupabaseFetch,
  RequestSupabaseInsert,
  ResponseSupabaseFetch,
} from "@types";
import {
  isFalsy,
  logError,
  saveData,
  getRouteAPI,
  fetchOptions,
  stringifyData,
  loadDataSecure,
  getNotifications,
  isLocationEnabled,
} from "@utils";
import { v4 } from "uuid";
import { useModal } from "./ModalContext";
import * as Location from "expo-location";
import { useLanguage } from "./LanguageContext";
import BackgroundModule from "@/utils/modules/BackgroundModule";
import _BackgroundTimer from "react-native-background-timer";
import { useUserContext } from "./UserContext";
import * as ExpoClipboard from "expo-clipboard";
import * as Notifications from "expo-notifications";
import NotificationModule from "@/utils/modules/NotificationModule";
import { navigateReplace } from "@/navigation/navigationRef";
import NativeFunctionsModule from "@/utils/modules/NativeFunctionsModule";
import { useDeviceInformation } from "./DeviceInformationContext";
import { DeviceEventEmitter, AppState, Platform } from "react-native";

interface NotificationsContextType {
  sendNotification: (
    notification: Omit<Notification, "id" | "timestamp">,
  ) => Promise<string | undefined>;
  lastItemCopied: React.RefObject<string | null>;
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
  const { t, language } = useLanguage();
  const { openSnackBar } = useModal();
  const { sessionToken, userData } = useUserContext();
  const { hasInternet, deviceInfo } = useDeviceInformation();

  const notificationsFromStorage = useRef<NotificationsType | null>(null);
  const [notifications, setNotifications] = useState<NotificationsType | null>(
    null,
  );
  const lastItemCopied = useRef<string | null>(null);
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

          await saveData("@notifications", newNotifications);
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
      if (Platform.OS === "web") return Promise.resolve("");
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
    [openSnackBar],
  );

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
              await saveData("@notifications", newNotifications);
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
              await saveData("@notifications", newNotifications);
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
    if (!userData?.userId || lastItemCopied.current) return;

    getNotifications().then((data) => setNotifications(data ?? null));

    if (!sessionToken) return;
    if (Platform.OS !== "web") return;

    getRouteAPI("/supabase/fetch").then(async (url) => {
      const res = await fetch(
        url,
        fetchOptions<RequestSupabaseFetch>(
          "POST",
          {
            lang: language,
            table: "ClipboardSync",
            match: { userId: userData.userId, deleted: false },
          },
          sessionToken,
        ),
      );
      const json = (await res.json()) as ResponseSupabaseFetch<"ClipboardSync">;
      lastItemCopied.current = v4();
      if (isFalsy(json) || isFalsy(json.data)) return;

      let data = json.data;
      if (!Array.isArray(data)) data = [data];
      if (data.length === 0) return;
      lastItemCopied.current = data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )?.[0]?.content;
    });
  }, [userData?.userId, sessionToken, language]);

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
        await saveData("@notifications", notifications);
      } catch (error) {
        logError("Error saving notifications to storage", error);
      }
    };
    saveNewNotifications();
    notificationsFromStorage.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (isFalsy(deviceInfo) || Platform.OS === "web") return;
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

        await sendNotification({
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

      await sendNotification({
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

    handleBatteryNotifications();
    const id = _BackgroundTimer.setTimeout(handleBatteryNotifications, 5000);
    return () => _BackgroundTimer.clearTimeout(id);
  }, [deviceInfo, sendNotification, t]);

  useEffect(() => {
    if (!hasInternet && prevHasInternet) {
      sendNotification({
        title: t("NoInternetConnection"),
        message: t("PleaseCheckInternetConnection"),
        type: "error",
        overrideNotification: false,
        channelId: "noInternetConnection",
        reasonNotification: "noInternetConnection",
      });
      return;
    } else if (
      prevHasInternet.current !== null &&
      !prevHasInternet.current &&
      hasInternet
    ) {
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
    if (Platform.OS !== "web") return;
    if (!hasInternet) return;
    if (!sessionToken) return;

    const handleIntervalClipboardWeb = async () => {
      if (isFalsy(typeof window) || !userData?.userId) return;

      try {
        let content: string | undefined = undefined;

        try {
          content = await ExpoClipboard.getStringAsync();
        } catch {
          const electronApp = (window as Window)?.UtilitiesForPC;
          if (electronApp) content = electronApp?.readClipboard?.();
        }
        if (isFalsy(content) || lastItemCopied.current === content) return;

        lastItemCopied.current = content;
        let deviceId = deviceInfo?.model;

        if (isFalsy(deviceId) || deviceId === "unknown")
          deviceId = "Platform: " + Platform.OS;

        await fetch(
          await getRouteAPI("/supabase/insert"),
          fetchOptions<RequestSupabaseInsert<"ClipboardSync">>(
            "POST",
            {
              lang: language,
              table: "ClipboardSync",
              values: {
                userId: userData.userId,
                content,
                deviceId,
                createdAt: new Date().toISOString(),
              },
            },
            sessionToken,
          ),
        );
      } catch (error) {
        logError("Error reading clipboard content", error);
      }
    };

    const id = _BackgroundTimer.setInterval(handleIntervalClipboardWeb, 2500);
    return () => {
      _BackgroundTimer.clearInterval(id);
    };
  }, [
    t,
    language,
    hasInternet,
    sessionToken,
    userData?.userId,
    deviceInfo?.model,
  ]);

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

    verifyLocation();
    const id = _BackgroundTimer.setInterval(verifyLocation, 60000);
    return () => _BackgroundTimer.clearInterval(id);
  }, [sendNotification, t]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    if (!sessionToken) return;

    BackgroundModule?.isRunning().then((running) => {
      if (running || !userData?.userId) return;

      loadDataSecure("_deviceId").then((deviceId) => {
        BackgroundModule?.setUserData(
          sessionToken,
          userData.userId,
          language,
          deviceId || "",
        );
      });
    });
  }, [sessionToken, userData?.userId, language]);

  const value: NotificationsContextType = {
    notifications,
    lastItemCopied,
    setNotifications,
    sendNotification,
    removeNotification,
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
