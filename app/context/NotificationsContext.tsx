import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { useLanguage } from "./LanguageContext";
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
  notifications: Notification[];
  addNotification: (
    notification: Omit<Notification, "id" | "timestamp">,
  ) => void;
  sendNotification: (
    notification: Omit<Notification, "id" | "timestamp">,
  ) => Promise<string>;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
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

  const [notifications, setNotifications] = useState<Notification[]>([]);
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

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp">) => {
      const newNotification: Notification = {
        ...notification,
        id: Date.now().toString(),
        timestamp: new Date(),
      };
      setNotifications((prev) => [...prev, newNotification]);
    },
    [],
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    const listener = addNetworkStateListener(
      ({ isConnected, isInternetReachable }) => {
        setHasInternet(!!isConnected && !!isInternetReachable);
      },
    );

    return () => listener.remove();
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
    notifications,
    addNotification,
    sendNotification,
    removeNotification,
    clearNotifications,
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
