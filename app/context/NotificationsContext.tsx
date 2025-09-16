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
  stringifyData,
  fetchFromTable,
  insertIntoTable,
  getNotifications,
} from "@utils";
import { useModal } from "./ModalContext";
import ClipboardModule from "@/utils/ClipboardModule";
import { useLanguage } from "./LanguageContext";
import { useUserContext } from "./UserContext";
import * as ExpoClipboard from "expo-clipboard";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import { useDeviceInformation } from "./DeviceInformationContext";
import { Notifications as NotificationsType, Tables } from "@types";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
  timestamp: Date;
  trigger?: Notifications.NotificationTriggerInput;
};

type Window = {
  myElectronApp?: {
    readClipboard: () => string;
  };
};

interface NotificationsContextType {
  sendNotification: (
    notification: Omit<Notification, "id" | "timestamp">,
  ) => Promise<string>;
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
  const { t } = useLanguage();
  const { openSnackBar } = useModal();
  const { session, user } = useUserContext();
  const { hasInternet, deviceInfo } = useDeviceInformation();

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
    if (!user?.id || lastItemCopied.current) return;

    getNotifications().then((data) => setNotifications(data ?? null));
    if (Platform.OS !== "web") return;

    fetchFromTable<Tables["ClipboardSync"]>("ClipboardSync", {
      userId: user.id,
      deleted: false,
    }).then(({ data }) => {
      lastItemCopied.current = Math.random().toString(32).substring(2, 10);
      if (isFalsy(data) || data.length === 0) return;
      lastItemCopied.current = data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )?.[0]?.content;
    });
  }, [user?.id]);

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
    if (hasInternet) {
      if (!session?.access_token) return;
      if (Platform.OS === "android")
        ClipboardModule?.isRunning().then((running) => {
          if (running) return;
          ClipboardModule?.setUserData(session?.access_token, user?.id || "");
          ClipboardModule?.startClipboardService();
        });
      if (Platform.OS !== "web") return;

      const id = setInterval(async () => {
        if (isFalsy(typeof window) || !user?.id) return;

        try {
          let text: string | undefined = undefined;

          try {
            text = await ExpoClipboard.getStringAsync();
          } catch {
            // eslint-disable-next-line no-undef
            const electronApp = (window as Window)?.myElectronApp;
            if (electronApp) text = electronApp?.readClipboard?.();
          }
          if (isFalsy(text) || lastItemCopied.current === text) return;

          lastItemCopied.current = text;
          let deviceId = deviceInfo?.model;

          if (isFalsy(deviceId) || deviceId === "unknown")
            deviceId = "Platform: " + Platform.OS;
          insertIntoTable<Tables["ClipboardSync"]>("ClipboardSync", {
            content: text,
            createdAt: new Date().toISOString(),
            userId: user.id || "",
            deviceId,
          });
        } catch (error) {
          logError("Error reading clipboard content", error);
        }
      }, 2500);

      return () => clearInterval(id);
    }

    if (AppState.currentState !== "active")
      sendNotification({
        title: t("NoInternetConnection"),
        message: t("PleaseCheckInternetConnection"),
        type: "error",
      });
    else openSnackBar(t("NoInternetConnection"), 12000);
    ClipboardModule?.stopClipboardService?.();
  }, [
    hasInternet,
    t,
    sendNotification,
    deviceInfo?.model,
    session?.access_token,
    user?.id,
    openSnackBar,
  ]);

  useEffect(() => {
    if (!session?.access_token) return;

    ClipboardModule?.setUserData(session?.access_token, user?.id || "");
    ClipboardModule?.startClipboardService?.();
  }, [session?.access_token, user?.id]);

  const value: NotificationsContextType = {
    notifications,
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
