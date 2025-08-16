import {
  loadData,
  saveData,
  reasonNotification,
  initializeNotificationsStorage,
  removeData,
  log,
  stringifyData,
  loadDataSecure,
} from "@utils";
import { useLanguage } from "@context/LanguageContext";
import { useWebSocket } from "@context/WebSocketContext";
import { useUserContext } from "@context/UserContext";
import useStylesNotifications from "@styles/components/settings/useStylesNotifications";
import { FlatList, Pressable } from "react-native";
import { Switch, Text, TextInput } from "react-native-paper";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Notifications, ReasonNotification, typeLanguages } from "@types";

interface NotificationsProps {
  onScrollableAreaTouch: (touching: boolean) => void;
}

const NotificationsComponent: React.FC<NotificationsProps> = ({
  onScrollableAreaTouch,
}) => {
  const { t } = useLanguage();
  const { styles } = useStylesNotifications();
  const { userData } = useUserContext();
  const { sendMessage } = useWebSocket();
  const [notifications, setNotifications] = useState<Notifications | null>(
    null,
  );
  const [minutes, setMinutes] = useState<Record<
    ReasonNotification,
    number | null
  > | null>();

  const notificationData = useMemo(() => {
    return Object.entries(notifications?.enabled || {})
      .map(([id, enabled]) => ({
        id,
        enabled,
      }))
      .sort((a, b) => (a.id > b.id ? 1 : -1));
  }, [notifications]);

  const handleChangeNotification = useCallback(
    async (id: string) => {
      if (!notifications) return;

      const updatedNotifications = {
        ...notifications,
        enabled: {
          ...notifications.enabled,
          [id as ReasonNotification]:
            !notifications.enabled[id as ReasonNotification],
        },
      };

      setNotifications(updatedNotifications);
      sendMessage({
        type: "notifications",
        data: updatedNotifications,
        uid: userData?.uid || "",
      });
      await saveData("@notifications", updatedNotifications);
    },
    [notifications, sendMessage, userData],
  );

  const handleChangeNotificationInterval = useCallback(
    async (id: string, value: string) => {
      if (!notifications) return;

      let interval = parseFloat(value);
      if (isNaN(interval)) interval = 0;

      setMinutes((prev) => ({
        ...prev,
        [id as ReasonNotification]: interval,
      }));
    },
    [notifications],
  );

  const renderNotificationItem = useCallback(
    ({ item }: { item: { id: string; enabled: boolean } }) => {
      return (
        <Pressable
          style={styles.notificationItem}
          onPress={() => handleChangeNotification(item.id)}
        >
          <Switch
            value={item.enabled}
            onChange={() => handleChangeNotification(item.id)}
          />
          <Text style={styles.notificationKey}>
            {t(item.id as keyof typeLanguages)}
          </Text>
          {notifications?.intervals?.[item.id as ReasonNotification] !==
            undefined && (
            <TextInput
              value={minutes?.[item.id as ReasonNotification]?.toString()}
              onChangeText={(text) =>
                handleChangeNotificationInterval(item.id, text)
              }
              label={t("notificationInterval")}
              style={styles.notificationInput}
            />
          )}
        </Pressable>
      );
    },
    [
      t,
      styles,
      minutes,
      notifications,
      handleChangeNotification,
      handleChangeNotificationInterval,
    ],
  );

  const handleTouchStart = useCallback(() => {
    onScrollableAreaTouch?.(true);
  }, [onScrollableAreaTouch]);

  const handleTouchEnd = useCallback(() => {
    onScrollableAreaTouch?.(false);
  }, [onScrollableAreaTouch]);

  useEffect(() => {
    const fetchNotifications = async () => {
      // await removeData("@notifications");
      let data = await loadData<Notifications | null>("@notifications");
      if (
        !data ||
        Object.keys(data.data).length !== reasonNotification.length
      ) {
        await initializeNotificationsStorage();
        data = await loadData<Notifications | null>("@notifications");
      }
      setNotifications(data);
      const mins = Object.fromEntries(
        Object.entries(data?.intervals || {}).map(([id, value]) => [
          id,
          value !== null ? (value as number) / (60 * 1000) : null,
        ]),
      ) as Record<ReasonNotification, number | null>;
      setMinutes(mins);
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    const saveIntervals = async () => {
      if (!notifications || !userData?.uid) return;
      const oldNotifications = await loadData<Notifications>("@notifications");

      const updatedNotifications = {
        ...notifications,
        intervals: {
          ...notifications.intervals,
          ...Object.fromEntries(
            Object.entries(minutes || {}).map(([id, value]) => [
              id,
              (value || 0) * 60 * 1000,
            ]),
          ),
        },
      };

      if (
        stringifyData(oldNotifications) === stringifyData(updatedNotifications)
      )
        return;

      setNotifications(updatedNotifications);
      sendMessage({
        type: "notifications",
        data: updatedNotifications,
        uid: userData.uid,
      });
      await saveData("@notifications", updatedNotifications);
    };

    const id = setTimeout(saveIntervals, 1000);

    return () => clearTimeout(id);
  }, [minutes, notifications, sendMessage, userData]);

  return (
    <FlatList
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchEndCapture={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      data={notificationData}
      renderItem={renderNotificationItem}
      keyExtractor={(item) => item.id}
    />
  );
};

const NotificationsMemo = React.memo(
  NotificationsComponent,
  (prevProps, nextProps) => {
    return prevProps.onScrollableAreaTouch === nextProps.onScrollableAreaTouch;
  },
);

export default NotificationsMemo;
