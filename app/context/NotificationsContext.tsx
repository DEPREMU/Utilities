import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
  useState,
  useRef,
} from "react";
import ClipboardModule from "@/utils/ClipboardModule";
import { useLanguage } from "./LanguageContext";
import * as Notifications from "expo-notifications";
import { Notifications as NotificationsType } from "@types";
import { useUserContext } from "./UserContext";
import { useDeviceInformation } from "./DeviceInformationContext";
import { getNotifications, isFalsy, saveData, stringifyData } from "@utils";
import { AppState } from "react-native";
import { useModal } from "./ModalContext";

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

  const sendNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp">) => {
      if (AppState.currentState === "active") {
        openSnackBar(
          [notification.title, notification.message].join("\n"),
          8000,
        );
        return Promise.resolve("");
      }

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
    Notifications.cancelScheduledNotificationAsync(id);
  }, []);

  useEffect(() => {
    getNotifications().then((data) => setNotifications(data ?? null));
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

    const s = async () => {
      try {
        await saveData("@notifications", notifications);
      } catch (error) {
        console.error("Error saving notifications to storage", error);
      }
    };
    s();
    notificationsFromStorage.current = notifications;
  }, [notifications]);

  useEffect(() => {
    if (isFalsy(deviceInfo)) return;

    const handleBatteryNotifications = async (): Promise<() => void> => {
      let id: string | null = null;
      const getDestroyer = (id: string | null) => () => {
        if (!id) return;
        Notifications.cancelScheduledNotificationAsync(id);
      };

      if (["charging", "full"].includes(deviceInfo?.powerState?.batteryState)) {
        if (deviceInfo.powerState.batteryLevel <= 0.8) return getDestroyer(id);

        id = await sendNotification({
          title: t("BatteryFullyCharged"),
          message: t("YouCanUnplugYourDevice"),
          type: "info",
        });
        return getDestroyer(id);
      } else if (
        deviceInfo?.powerState?.batteryLevel >= 0.3 &&
        ["unplugged", "unknown"].includes(deviceInfo?.powerState?.batteryState)
      )
        return getDestroyer(id);

      id = await sendNotification({
        title: t("BatteryLow"),
        message: t("YourBatteryIsLow"),
        type: "warning",
      });

      return getDestroyer(id);
    };

    const destroyer = handleBatteryNotifications();

    return () => {
      destroyer.then((func) => func?.());
    };
  }, [deviceInfo, sendNotification, t]);

  useEffect(() => {
    if (hasInternet) {
      if (!session?.access_token) return;
      ClipboardModule?.isRunning().then((running) => {
        if (running) return;
        ClipboardModule?.setUserData(session?.access_token, user?.id || "");
        ClipboardModule?.startClipboardService();
      });
      return;
    }

    let notification: Promise<string>;
    if (AppState.currentState !== "active")
      notification = sendNotification({
        title: t("NoInternetConnection"),
        message: t("PleaseCheckInternetConnection"),
        type: "error",
      });
    else openSnackBar(t("NoInternetConnection"), 12000);
    ClipboardModule?.stopClipboardService?.();

    return () => {
      notification.then((id) => {
        Notifications.cancelScheduledNotificationAsync(id);
      });
    };
  }, [
    hasInternet,
    t,
    sendNotification,
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
