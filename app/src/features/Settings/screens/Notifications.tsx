import {
  Notifications,
  ReasonNotification,
  RequestDatabaseUpdate,
} from "@types";
import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  memoDeep,
  REPLACERS,
  fetchToServer,
  DATA_PLATFORM,
  sessionManager,
  getFormattedDate,
  storageManagement,
  getDefaultMinutes,
  setTimeoutPolyfill,
  notificationsManager,
  clearTimeoutPolyfill,
  askForPermission,
} from "@utils";
import Button from "@/common/components/Button/screens";
import { useLanguage } from "@/context/LanguageContext";
import { useWebSocket } from "@/context/WebSocketContext";
import { FlatList, View } from "react-native";
import { useUserContext } from "@/context/UserContext";
import { navigateReplace } from "@/app/refs/navigationRef";
import { useBackgroundTask } from "@/context/BackgroundTaskContext";
import useStylesNotifications from "@/features/Settings/styles/useStylesNotifications";
import { Switch, Text, TextInput } from "react-native-paper";

type typeMinutes = Record<ReasonNotification, number | null> | null;

type NotificationsData = {
  id: ReasonNotification;
  data: Notifications[ReasonNotification];
}[];

const NotificationsScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesNotifications();
  const { isLoggedIn } = useUserContext();
  const { sendMessageRef } = useWebSocket();
  const { addTaskQueueRef } = useBackgroundTask();

  const [minutes, setMinutes] = useState<typeMinutes>();
  const [notifications, setNotifications] = useState<Notifications | null>(
    null,
  );

  const normalizeHourRef = useRef((value: string): number => {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return 0;
    return Math.max(0, Math.min(23, parsed));
  });

  const updateNotificationSettingsRef = useRef(
    async (
      id: ReasonNotification,
      updater: (
        prev: Notifications[ReasonNotification],
      ) =>
        | Partial<Notifications[ReasonNotification]>
        | Notifications[ReasonNotification],
    ) => {
      notificationsManager.editNotification(id, updater, (data) =>
        setNotifications(data),
      );
    },
  );

  const handleToggleBehaviorRef = useRef(
    async (
      id: ReasonNotification,
      key: keyof Notifications["allNotifications"]["behavior"],
    ) => {
      if (key === "bypassDoNotDisturb") {
        const granted = await askForPermission("doNotDisturb", {
          overrideDoNotAskAgain: true,
        });
        if (!granted) return;
      }

      await updateNotificationSettingsRef.current(id, (prev) => ({
        ...prev,
        behavior: {
          ...prev.behavior,
          [key]: !prev.behavior[key],
          ...(key === "bypassDoNotDisturb" && !prev.behavior.bypassDoNotDisturb
            ? { onlyWhenNotInDoNotDisturb: false }
            : {}),
          ...(key === "onlyWhenNotInDoNotDisturb" &&
          !prev.behavior.onlyWhenNotInDoNotDisturb
            ? { bypassDoNotDisturb: false }
            : {}),
        },
      }));
    },
  );

  const handleSpecificHoursChangeRef = useRef(
    async (
      id: ReasonNotification,
      key: "startHour" | "endHour",
      value: string,
    ) => {
      const hour = normalizeHourRef.current(value);
      await updateNotificationSettingsRef.current(id, (prev) => ({
        ...prev,
        behavior: {
          ...prev.behavior,
          onlyDuringSpecificHours: {
            ...prev.behavior.onlyDuringSpecificHours,
            [key]: hour,
          },
        },
      }));
    },
  );

  const handleToggleSpecificHoursEnabledRef = useRef(
    async (id: ReasonNotification) => {
      await updateNotificationSettingsRef.current(id, (prev) => ({
        ...prev,
        behavior: {
          ...prev.behavior,
          onlyDuringSpecificHours: {
            ...prev.behavior.onlyDuringSpecificHours,
            enabled: !prev.behavior.onlyDuringSpecificHours.enabled,
          },
        },
      }));
    },
  );

  const handleToggleStreamerRef = useRef(
    async (name: string, enabled: boolean) => {
      await updateNotificationSettingsRef.current("streamers", (prev) => ({
        ...prev,
        streamersList: ("streamersList" in prev ? prev.streamersList : []).map(
          (streamer) =>
            streamer.name === name
              ? { ...streamer, enabled: !enabled }
              : streamer,
        ),
      }));
    },
  );

  const handleChangeNotificationRef = useRef(
    async (reason: ReasonNotification) => {
      if (reason === "cryptos" && !sessionManager.getSessionData().isLoggedIn)
        return navigateReplace("Login");
      if (reason === "locationEnabled") {
        const granted = await askForPermission("location", {
          overrideDoNotAskAgain: true,
        });
        if (!granted) return;
      }

      await notificationsManager.toggleNotification(reason);
      setNotifications(notificationsManager.getNotifications());
    },
  );

  const handleChangeNotificationIntervalRef = useRef(
    async (id: ReasonNotification, value: string) => {
      const { sessionToken, userData } = sessionManager.getSessionData();

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

        const deviceId = storageManagement.get("DEVICE_ID");
        const taskId =
          Date.now().toString() + Math.random().toString(36).substring(2, 8);
        const values: RequestDatabaseUpdate["values"] = {
          interval: interval > 0 ? interval * 60 * 1000 : -1,
        };
        const match: RequestDatabaseUpdate["match"] = {
          userId: userData.userId,
          reason: id,
        };
        addTaskQueueRef.current(
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
                  lang: storageManagement.get("LANGUAGE"),
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

        return updated;
      });
    },
  );

  const notificationData: NotificationsData = useMemo(() => {
    return Object.keys(notifications || notificationsManager.getNotifications())
      .reduce(
        (acc, reason) => {
          const reasonKey = reason as ReasonNotification;
          acc.push({
            id: reasonKey,
            data:
              notifications?.[reasonKey] ||
              notificationsManager.getNotification(reasonKey),
          });
          return acc;
        },
        [] as {
          id: ReasonNotification;
          data: Notifications[ReasonNotification];
        }[],
      )
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [notifications]);

  const renderNotificationItem = useCallback(
    ({ item }: { item: NotificationsData[number] }) => {
      if (REPLACERS.isWeb) {
        if (
          item.id === "cryptos" ||
          item.id === "streamers" ||
          item.id === "downDetector" ||
          item.id === "locationEnabled" ||
          item.id === "recorderNotification" || //TODO: Check if recorder should be supported on web
          (item.id === "batteryAlerts" && !DATA_PLATFORM.hasBattery)
        ) {
          return null;
        }
      }

      const defaultMinutes = getDefaultMinutes(item.id);
      let minutesItem = defaultMinutes;
      if (defaultMinutes !== -1 && (minutes?.[item.id] || -1) > -1) {
        minutesItem = minutes?.[item.id] || defaultMinutes;
      }

      const behavior = item.data.behavior;
      const paused = item.data.paused;
      const intervalMinutes =
        minutes?.[item.id] ??
        (item.data.interval > 0 ? item.data.interval / (60 * 1000) : null);

      const formatBoolean = (value: boolean) => (value ? t("yes") : t("no"));

      const formatPausedUntil = () => {
        if (!paused.isPaused || paused.timePaused <= 0)
          return t("notAvailable");

        return getFormattedDate(new Date(paused.timePaused), undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        });
      };

      const streamersList =
        "streamersList" in item.data ? item.data.streamersList || [] : [];

      return (
        <View style={styles.containerNotificationItem} key={item.id}>
          <Button
            handlePress={() => handleChangeNotificationRef.current(item.id)}
            replaceStyles={{ button: styles.notificationItem, textButton: {} }}
            disabled={item.id === "cryptos" && !isLoggedIn}
          >
            <Text style={styles.notificationKey}>{t(item.id)}</Text>
            <Switch
              value={item.data.enabled}
              disabled={item.id === "cryptos" && !isLoggedIn}
              onChange={() => handleChangeNotificationRef.current(item.id)}
            />
          </Button>
          {item.data.enabled && minutesItem > -1 && (
            <TextInput
              value={minutesItem?.toString()}
              onChangeText={(text) =>
                handleChangeNotificationIntervalRef.current(item.id, text)
              }
              keyboardType="numeric"
              label={t("settings.notificationInterval")}
              style={styles.notificationInput}
            />
          )}
          {item.data.enabled && (
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {t("settings.notificationDetailsEnabled")}
                </Text>
                <Text style={styles.detailValue}>
                  {formatBoolean(item.data.enabled)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {t("settings.notificationDetailsInterval")}
                </Text>
                <Text style={styles.detailValue}>
                  {typeof intervalMinutes === "number" && intervalMinutes >= 0
                    ? `${intervalMinutes}`
                    : t("notAvailable")}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {t("settings.notificationDetailsPaused")}
                </Text>
                <Text style={styles.detailValue}>
                  {formatBoolean(paused.isPaused)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {t("settings.notificationDetailsPausedUntil")}
                </Text>
                <Text style={styles.detailValue}>{formatPausedUntil()}</Text>
              </View>
              {item.id !== "allNotifications" &&
                item.id !== "timeToDownload" &&
                item.id !== "recorderNotification" && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      {t("settings.notificationDetailsBehavior")}
                    </Text>
                    {REPLACERS.isNative && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          {t("settings.notificationDetailsOnlyWhenScreenOff")}
                        </Text>
                        <Switch
                          value={behavior.onlyWhenScreenOff}
                          onValueChange={() =>
                            handleToggleBehaviorRef.current(
                              item.id,
                              "onlyWhenScreenOff",
                            )
                          }
                        />
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t(
                          "settings.notificationDetailsOnlyWhenAppInBackground",
                        )}
                      </Text>
                      <Switch
                        value={behavior.onlyWhenAppInBackground}
                        onValueChange={() =>
                          handleToggleBehaviorRef.current(
                            item.id,
                            "onlyWhenAppInBackground",
                          )
                        }
                      />
                    </View>
                    {(REPLACERS.isNative ||
                      (REPLACERS.isWeb && DATA_PLATFORM.hasBattery)) && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>
                          {t(
                            "settings.notificationDetailsOnlyWhenConnectedToPower",
                          )}
                        </Text>
                        <Switch
                          value={behavior.onlyWhenConnectedToPower}
                          onValueChange={() =>
                            handleToggleBehaviorRef.current(
                              item.id,
                              "onlyWhenConnectedToPower",
                            )
                          }
                        />
                      </View>
                    )}
                    {REPLACERS.isNative && (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>
                            {t(
                              "settings.notificationDetailsOnlyWhenNotInDoNotDisturb",
                            )}
                          </Text>
                          <Switch
                            value={behavior.onlyWhenNotInDoNotDisturb}
                            onValueChange={() =>
                              handleToggleBehaviorRef.current(
                                item.id,
                                "onlyWhenNotInDoNotDisturb",
                              )
                            }
                          />
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>
                            {t(
                              "settings.notificationDetailsBypassDoNotDisturb",
                            )}
                          </Text>
                          <Switch
                            value={behavior.bypassDoNotDisturb}
                            onValueChange={() =>
                              handleToggleBehaviorRef.current(
                                item.id,
                                "bypassDoNotDisturb",
                              )
                            }
                          />
                        </View>
                      </>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t(
                          "settings.notificationDetailsOnlyDuringSpecificHours",
                        )}
                      </Text>
                      <Switch
                        value={behavior.onlyDuringSpecificHours.enabled}
                        onValueChange={() =>
                          handleToggleSpecificHoursEnabledRef.current(item.id)
                        }
                      />
                    </View>
                    {behavior.onlyDuringSpecificHours.enabled && (
                      <View style={styles.detailRow}>
                        <TextInput
                          value={String(
                            behavior.onlyDuringSpecificHours.startHour,
                          )}
                          onChangeText={(text) =>
                            handleSpecificHoursChangeRef.current(
                              item.id,
                              "startHour",
                              text,
                            )
                          }
                          keyboardType="numeric"
                          label={t("settings.notificationDetailsStartHour")}
                          style={styles.detailInput}
                        />
                        <TextInput
                          value={String(
                            behavior.onlyDuringSpecificHours.endHour,
                          )}
                          onChangeText={(text) =>
                            handleSpecificHoursChangeRef.current(
                              item.id,
                              "endHour",
                              text,
                            )
                          }
                          keyboardType="numeric"
                          label={t("settings.notificationDetailsEndHour")}
                          style={styles.detailInput}
                        />
                      </View>
                    )}
                  </View>
                )}
              {item.id === "streamers" && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    {t("settings.notificationDetailsStreamers")}
                  </Text>
                  {streamersList.length ? (
                    streamersList.map((streamer) => (
                      <View style={styles.detailRow} key={streamer.name}>
                        <Text style={styles.detailLabel}>{streamer.name}</Text>
                        <Switch
                          value={streamer.enabled}
                          onValueChange={() =>
                            handleToggleStreamerRef.current(
                              streamer.name,
                              streamer.enabled,
                            )
                          }
                        />
                      </View>
                    ))
                  ) : (
                    <Text style={styles.detailValue}>
                      {t("settings.notificationDetailsNoStreamers")}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      );
    },
    [t, styles, minutes, isLoggedIn],
  );

  useEffect(() => {
    const fetchNotifications = async () => {
      const data = notificationsManager.getNotifications();
      setNotifications(data);

      const mins = Object.fromEntries(
        Object.entries(data || {}).map(([id, value]) => [
          id,
          value.interval > 0 ? value.interval / (60 * 1000) : null,
        ]),
      ) as Record<ReasonNotification, number | null>;
      setMinutes(mins);
    };

    fetchNotifications();
  }, []);

  useEffect(() => {
    const saveIntervals = async () => {
      const { userData } = sessionManager.getSessionData();

      if (!notifications || !userData?.userId) return;
      notificationsManager.editNotifications((prev) => {
        return Object.fromEntries(
          Object.entries(prev).map(([reason, value]) => {
            const reasonKey = reason as ReasonNotification;
            const newInterval = minutes?.[reasonKey];
            if (!newInterval) return [reason, value];

            return [
              reason,
              {
                ...value,
                interval: newInterval > 0 ? newInterval * 60 * 1000 : -1,
              },
            ];
          }),
        );
      });
    };

    const id = setTimeoutPolyfill(saveIntervals, 1000);

    return () => clearTimeoutPolyfill(id);
  }, [minutes, notifications, sendMessageRef]);

  return (
    <View style={styles.container}>
      <FlatList
        data={notificationData}
        style={styles.containerFlatList}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.contentContainer}
      />
    </View>
  );
};

export default memoDeep(NotificationsScreen);
