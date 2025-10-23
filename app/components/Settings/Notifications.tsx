import {
  Notifications,
  typeLanguages,
  ReasonNotification,
  RequestSupabaseUpdate,
} from "@types";
import {
  isFalsy,
  saveData,
  getRouteAPI,
  fetchOptions,
  stringifyData,
  getNotifications,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import { FlatList } from "react-native";
import * as Location from "expo-location";
import { useLanguage } from "@context/LanguageContext";
import { useWebSocket } from "@context/WebSocketContext";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { useBackgroundTask } from "@/context/BackgroundTaskContext";
import useStylesNotifications from "@styles/components/settings/useStylesNotifications";
import { Switch, Text, TextInput } from "react-native-paper";
import React, { useCallback, useEffect, useMemo, useState } from "react";

interface NotificationsProps {
  onScrollableAreaTouch: (touching: boolean) => void;
}

type typeMinutes = Record<ReasonNotification, number | null> | null;

const NotificationsComponent: React.FC<NotificationsProps> = ({
  onScrollableAreaTouch,
}) => {
  const { styles } = useStylesNotifications();
  const { t, language } = useLanguage();
  const { sendMessage } = useWebSocket();
  const { addTaskQueue } = useBackgroundTask();
  const { userData, sessionToken } = useUserContext();
  const [notifications, setNotifications] = useState<Notifications | null>(
    null,
  );
  const [minutes, setMinutes] = useState<typeMinutes>();

  const notificationData = useMemo(() => {
    const entries = Object.entries(notifications?.enabled || {})
      .map(([id, enabled]) => ({
        id: id as ReasonNotification,
        enabled,
      }))
      .filter((item) => item.id !== "streamers")
      .sort((a, b) => (a.id > b.id ? 1 : -1));
    return entries as { id: ReasonNotification; enabled: boolean }[];
  }, [notifications]);

  const handleChangeNotification = useCallback(
    async (reason: ReasonNotification) => {
      if (!sessionToken) return navigateReplace("Login");
      if (!userData?.userId) return;
      if (reason === "locationEnabled") {
        await Location.requestForegroundPermissionsAsync();
        await Location.requestBackgroundPermissionsAsync();
      }

      setNotifications((prev) => {
        if (!prev) return prev;
        const id =
          Date.now().toString() + Math.random().toString(36).substring(2, 8);
        const updated = {
          ...prev,
          enabled: {
            ...prev.enabled,
            [reason]: !prev.enabled[reason],
          },
        };
        getRouteAPI("/supabase/update").then((url) => {
          const values: RequestSupabaseUpdate["values"] = {
            enabled: !!updated.enabled[reason],
          };
          const match: RequestSupabaseUpdate["match"] = {
            userId: userData.userId,
            reason,
          };
          addTaskQueue(
            async () => {
              fetch(
                url,
                fetchOptions<RequestSupabaseUpdate>(
                  "POST",
                  {
                    match,
                    table: "UserNotificationsConfig",
                    values,
                    lang: language,
                  },
                  sessionToken,
                ),
              );
            },
            true,
            {
              id,
              args: ["UserNotificationsConfig", values, match],
              functionName: "updateFromSupabase",
            },
            id,
          );
        });

        saveData("@notifications", updated);
        return updated;
      });
    },
    [userData?.userId, sessionToken, language, addTaskQueue],
  );

  const handleChangeNotificationInterval = useCallback(
    async (id: ReasonNotification, value: string) => {
      if (!sessionToken) return navigateReplace("Login");
      if (!userData?.userId) return;

      let interval = parseFloat(value);
      if (isNaN(interval)) interval = -1;

      setMinutes((prev) => {
        const updated = {
          ...prev,
          [id]: interval,
        } as typeMinutes;

        getRouteAPI("/supabase/update").then((url) => {
          const taskId =
            Date.now().toString() + Math.random().toString(36).substring(2, 8);
          const values: RequestSupabaseUpdate["values"] = {
            interval: interval * 60 * 1000,
          };
          const match: RequestSupabaseUpdate["match"] = {
            userId: userData.userId,
            reason: id,
          };
          addTaskQueue(
            async () => {
              fetch(
                url,
                fetchOptions<RequestSupabaseUpdate>(
                  "POST",
                  {
                    match,
                    table: "UserNotificationsConfig",
                    values,
                    lang: language,
                  },
                  sessionToken,
                ),
              );
            },
            true,
            {
              id: taskId,
              args: ["UserNotificationsConfig", values, match],
              functionName: "updateFromSupabase",
            },
            taskId,
          );
        });

        return updated;
      });
    },
    [userData?.userId, sessionToken, language, addTaskQueue],
  );

  const renderNotificationItem = useCallback(
    ({ item }: { item: { id: ReasonNotification; enabled: boolean } }) => {
      const interval = notifications?.intervals?.[item.id];
      const minutesItem = minutes?.[item.id] || -1;

      return (
        <>
          <Button
            replaceStyles={{ button: styles.notificationItem, textButton: {} }}
            argsFuncHandlePress={item.id}
            handlePress={handleChangeNotification}
          >
            <>
              <Switch
                value={item.enabled}
                onChange={() => handleChangeNotification(item.id)}
              />
              <Text style={styles.notificationKey}>
                {t(item.id as keyof typeLanguages)}
              </Text>
            </>
          </Button>
          {item.enabled && !isFalsy(interval) && minutesItem > 0 && (
            <TextInput
              value={minutesItem?.toString()}
              onChangeText={(text) =>
                handleChangeNotificationInterval(
                  item.id as ReasonNotification,
                  text,
                )
              }
              keyboardType="numeric"
              label={t("notificationInterval")}
              style={styles.notificationInput}
            />
          )}
        </>
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
      const data = await getNotifications();
      setNotifications(data);

      const mins = Object.fromEntries(
        Object.entries(data?.intervals || {}).map(([id, value]) => [
          id,
          value !== null || value !== -1
            ? (value as number) / (60 * 1000)
            : null,
        ]),
      ) as Record<ReasonNotification, number | null>;
      setMinutes(mins);
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    const saveIntervals = async () => {
      if (!notifications || !userData?.userId) return;
      const oldNotifications = await getNotifications();

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
        userId: userData.userId,
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
