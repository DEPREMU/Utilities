import {
  Window,
  Notifications as NotificationsType,
  RequestSupabaseFetch,
  RequestSupabaseInsert,
  ResponseSupabaseFetch,
} from "@types";
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
  isFalsy,
  logError,
  saveData,
  getRouteAPI,
  fetchOptions,
  stringifyData,
  getNotifications,
  loadDataSecure,
} from "@utils";
import { v4 } from "uuid";
import { useModal } from "./ModalContext";
import ClipboardModule from "@/utils/modules/ClipboardModule";
import { useLanguage } from "./LanguageContext";
import { useUserContext } from "./UserContext";
import * as ExpoClipboard from "expo-clipboard";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import { useDeviceInformation } from "./DeviceInformationContext";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  timestamp: Date;
  trigger?: Notifications.NotificationTriggerInput;
};

interface NotificationsContextType {
  sendNotification: (
    notification: Omit<Notification, "id" | "timestamp">,
  ) => Promise<string>;
  lastItemCopied: React.RefObject<string | null>;
  removeNotification: (id: string) => void;
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
  const { hasInternet, deviceInfo } = useDeviceInformation();
  const { sessionToken, userData } = useUserContext();

  const notificationsFromStorage = useRef<NotificationsType | null>(null);
  const [notifications, setNotifications] = useState<NotificationsType | null>(
    null,
  );
  const lastItemCopied = useRef<string | null>(null);

  const sendNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp">) => {
      if (AppState.currentState === "active") {
        openSnackBar(
          [notification.title, notification.message].join("\n"),
          8000,
        );
        return Promise.resolve("");
      }
      if (Platform.OS === "web") return Promise.resolve("");

      return Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: { type: notification.type },
        },
        trigger: notification.trigger || null,
      });
    },
    [openSnackBar],
  );

  const removeNotification = useCallback((id: string) => {
    if (Platform.OS === "web") return;
    Notifications.cancelScheduledNotificationAsync(id);
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

    const handleBatteryNotifications = async () => {
      if (["charging", "full"].includes(deviceInfo?.powerState?.batteryState)) {
        if (deviceInfo.powerState.batteryLevel <= 0.8) return;

        await sendNotification({
          title: t("BatteryFullyCharged"),
          message: t("YouCanUnplugYourDevice"),
          type: "info",
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
      });
    };

    const id = setTimeout(handleBatteryNotifications, 5000);

    return () => clearTimeout(id);
  }, [deviceInfo, sendNotification, t]);

  useEffect(() => {
    if (!hasInternet) {
      sendNotification({
        title: t("NoInternetConnection"),
        message: t("PleaseCheckInternetConnection"),
        type: "error",
      });
      ClipboardModule?.stopClipboardService?.();
      return;
    }

    if (!sessionToken) return;
    if (Platform.OS === "android")
      ClipboardModule?.isRunning().then((running) => {
        if (running || !userData?.userId) return;
        loadDataSecure("_deviceId").then((deviceId) => {
          ClipboardModule?.setUserData(
            sessionToken,
            userData.userId,
            language,
            deviceId || "",
          );
          ClipboardModule?.startClipboardService();
        });
      });
    if (Platform.OS !== "web") return;

    const handleInterval = async () => {
      if (isFalsy(typeof window) || !userData?.userId) return;

      try {
        let content: string | undefined = undefined;

        try {
          content = await ExpoClipboard.getStringAsync();
        } catch {
          // eslint-disable-next-line no-undef
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

    const id = setInterval(handleInterval, 2500);

    return () => clearInterval(id);
  }, [
    t,
    language,
    hasInternet,
    sessionToken,
    openSnackBar,
    userData?.userId,
    deviceInfo?.model,
    sendNotification,
  ]);

  useEffect(() => {
    if (!sessionToken) return;

    loadDataSecure("_deviceId").then((deviceId) => {
      ClipboardModule?.setUserData(
        sessionToken,
        userData?.userId || "",
        language,
        deviceId || "",
      );
      ClipboardModule?.startClipboardService?.();
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
