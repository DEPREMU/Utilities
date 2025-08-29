import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { useLanguage } from "./LanguageContext";
import {  getRouteAPI } from "@utils";
import * as Notifications from "expo-notifications";
import { addNetworkStateListener } from "expo-network";

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

  const [hasInternet, setHasInternet] = useState<boolean>(true);

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
    const listener = addNetworkStateListener((values) => {
      const { isConnected, isInternetReachable } = values;
      setHasInternet(!!isConnected && !!isInternetReachable);
    });

    const id = setInterval(async () => {
      try {
        const res = await axios.get(await getRouteAPI("/health"), {
          timeout: 5000,
        });
        const data = res.data || { status: null };
        setHasInternet(data?.status === "ok");
      } catch {
        setHasInternet(false);
      }
    }, 10000);

    return () => {
      clearInterval(id);
      listener.remove();
    };
  }, []);

  useEffect(() => {
    if (hasInternet) return;

    const notification = sendNotification({
      title: t("NoInternetConnection"),
      message: t("PleaseCheckInternetConnection"),
      type: "error",
    });

    return () => {
      notification.then((id) => {
        Notifications.cancelScheduledNotificationAsync(id);
      });
    };
  }, [hasInternet, t, sendNotification]);

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
