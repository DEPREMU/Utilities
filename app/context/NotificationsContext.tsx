import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import ClipboardModule from "@/utils/ClipboardModule";
import { useLanguage } from "./LanguageContext";
import * as Notifications from "expo-notifications";
import { useUserContext } from "./UserContext";
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
  removeNotification: (id: string) => void;
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
  const { session, user } = useUserContext();
  const { hasInternet } = useDeviceInformation();

  const sendNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp">) => {
      return Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: { type: notification.type },
        },
        trigger: notification.trigger || null,
      });
    },
    [],
  );

  const removeNotification = useCallback((id: string) => {
    Notifications.cancelScheduledNotificationAsync(id);
  }, []);

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

    const notification = sendNotification({
      title: t("NoInternetConnection"),
      message: t("PleaseCheckInternetConnection"),
      type: "error",
    });
    ClipboardModule?.stopClipboardService?.();

    return () => {
      notification.then((id) => {
        Notifications.cancelScheduledNotificationAsync(id);
      });
    };
  }, [hasInternet, t, sendNotification, session?.access_token, user?.id]);

  useEffect(() => {
    if (!session?.access_token) return;

    ClipboardModule?.setUserData(session?.access_token, user?.id || "");
    ClipboardModule?.startClipboardService?.();
  }, [session?.access_token, user?.id]);

  const value: NotificationsContextType = {
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
