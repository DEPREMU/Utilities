import {
  Notifications,
  typeLanguagesKeys,
  ReasonNotification,
  RequestDatabaseUpdate,
} from "@types";
import {
  memoDeep,
  stringifyData,
  fetchToServer,
  loadDataStorage,
  saveDataStorage,
  getNotifications,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
  askLocationPermission,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import { FlatList } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { useWebSocket } from "@context/WebSocketContext";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import useStylesNotifications from "@styles/components/settings/useStylesNotifications";
import { Switch, Text, TextInput } from "react-native-paper";
import React, { useCallback, useEffect, useMemo, useState } from "react";

interface NotificationsProps {
  onScrollableAreaTouch: (touching: boolean) => void;
}

type typeMinutes = Record<ReasonNotification, number | null> | null;

const intervalValues: Record<ReasonNotification, number> = {
  cryptos: 0,
  streamers: -1,
  downDetector: -1,
  batteryAlerts: -1,
  timeToDownload: -1,
  locationEnabled: -1,
  allNotifications: -1,
  noInternetConnection: -1,
  loggedInStatusChannel: -1,
};

const getDefaultMinutes = (reason: ReasonNotification): number => {
  return intervalValues?.[reason] ?? -1;
};

const NotificationsComponent: React.FC<NotificationsProps> = ({
  onScrollableAreaTouch,
}) => {
  const { styles } = useStylesNotifications();
  const { t, language } = useLanguage();
  const { addTaskQueue } = useBackgroundTask();
  const { sendMessageRef } = useWebSocket();
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
      if (!sessionToken && reason === "cryptos")
        return navigateReplace("Login");
      if (reason === "locationEnabled") await askLocationPermission();

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
        if (sessionToken && userData?.userId)
          loadDataStorage("DEVICE_ID").then(async (deviceId) => {
            const values: RequestDatabaseUpdate["values"] = {
              enabled: !!updated.enabled[reason],
            };
            const match: RequestDatabaseUpdate["match"] = {
              userId: userData.userId,
              reason,
            };
            addTaskQueue(
              {
                requiresInternet: true,
                func: async () => {
                  fetchToServer(
                    "/database/update",
                    {
                      match,
                      table: "UserNotificationsConfig",
                      values,
                      deviceId,
                      lang: language,
                    },
                    sessionToken,
                  );
                },
              },
              {
                id,
                args: ["UserNotificationsConfig", values, match],
                functionName: "updateFromDatabase",
              },
              id,
            );
          });

        saveDataStorage("NOTIFICATIONS", updated);
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
      if (isNaN(interval)) interval = getDefaultMinutes(id);

      setMinutes((prev) => {
        const updated = {
          ...prev,
          [id]: interval,
        } as typeMinutes;

        if (interval <= 0) return updated;

        loadDataStorage("DEVICE_ID").then(async (deviceId) => {
          const taskId =
            Date.now().toString() + Math.random().toString(36).substring(2, 8);
          const values: RequestDatabaseUpdate["values"] = {
            interval: interval > 0 ? interval * 60 * 1000 : -1,
          };
          const match: RequestDatabaseUpdate["match"] = {
            userId: userData.userId,
            reason: id,
          };
          addTaskQueue(
            {
              requiresInternet: true,
              func: async () => {
                fetchToServer(
                  "/database/update",
                  {
                    match,
                    deviceId,
                    table: "UserNotificationsConfig",
                    values,
                    lang: language,
                  },
                  sessionToken,
                );
              },
            },
            {
              id: taskId,
              args: ["UserNotificationsConfig", values, match],
              functionName: "updateFromDatabase",
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
      const minutesItem = minutes?.[item.id] ?? getDefaultMinutes(item.id);

      return (
        <>
          <Button
            replaceStyles={{ button: styles.notificationItem, textButton: {} }}
            argsFuncHandlePress={[item.id]}
            handlePress={handleChangeNotification}
          >
            <>
              <Switch
                value={item.enabled}
                onChange={() => handleChangeNotification(item.id)}
              />
              <Text style={styles.notificationKey}>
                {t(item.id as typeLanguagesKeys)}
              </Text>
            </>
          </Button>
          {item.enabled && minutesItem > -1 && (
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
          value && value > 0 ? value / (60 * 1000) : null,
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
              value && value > 0 ? value * 60 * 1000 : null,
            ]),
          ),
        },
      };

      if (
        stringifyData(oldNotifications) === stringifyData(updatedNotifications)
      )
        return;

      setNotifications(updatedNotifications);
      sendMessageRef.current("main", {
        type: "notifications",
        data: updatedNotifications,
        userId: userData.userId,
      });
      await saveDataStorage("NOTIFICATIONS", updatedNotifications);
    };

    const id = setTimeoutPolyfill(saveIntervals, 1000);

    return () => clearTimeoutPolyfill(id);
  }, [minutes, notifications, sendMessageRef, userData]);

  return (
    <FlatList
      data={notificationData}
      style={styles.container}
      onTouchEnd={handleTouchEnd}
      renderItem={renderNotificationItem}
      onTouchStart={handleTouchStart}
      keyExtractor={(item) => item.id}
      onTouchCancel={handleTouchEnd}
      onTouchEndCapture={handleTouchEnd}
      contentContainerStyle={styles.contentContainer}
    />
  );
};

const NotificationsMemo = memoDeep(NotificationsComponent);

export default NotificationsMemo;
