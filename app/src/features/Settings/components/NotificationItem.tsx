import {
  Notifications,
  ReasonNotification,
  typeStreamerNotification,
} from "@types";
import { DATA_PLATFORM, getFormattedDate, memoDeep, REPLACERS } from "@utils";
import { Helper } from "@common";
import { View } from "react-native";
import Button from "@components/Button/screens";
import { useLanguage } from "@context/LanguageContext";
import { Switch, Text } from "react-native-paper";
import { useStylesNotifications } from "@screens/Settings/styles/useStylesNotifications";
import NotificationBehaviorSection, {
  UpdateNotificationsHandler,
} from "@screens/Settings/components/NotificationBehaviorSection";
import NotificationStreamersSection from "@screens/Settings/components/NotificationStreamersSection";
import React from "react";
import Animated, {
  FadeInDown,
  FadeOutDown,
  LinearTransition,
} from "react-native-reanimated";

export type NotificationListItem = {
  id: ReasonNotification;
  data: Notifications[ReasonNotification];
};

type NotificationItemProps = {
  item: NotificationListItem;
  isLoggedIn: boolean;
  onToggleNotification: (reason: ReasonNotification) => void;
  onUpdateNotifications: UpdateNotificationsHandler;
  onToggleStreamer: (streamer: typeStreamerNotification) => void;
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  item,
  isLoggedIn,
  onToggleNotification,
  onUpdateNotifications,
  onToggleStreamer,
}) => {
  const { t } = useLanguage();
  const { styles } = useStylesNotifications();

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

  const behavior = item.data.behavior;
  const paused = item.data.paused;
  const formatBoolean = (value: boolean) =>
    value ? t("common.yes") : t("common.no");

  const streamersList = Helper.Object.getValue(item.data, "streamersList", []);
  const batteryLevel =
    item.id === "batteryAlerts"
      ? (item.data as Notifications["batteryAlerts"]).behavior.batteryLevel
      : undefined;
  const doubleCheck =
    item.id === "noInternetConnection"
      ? (item.data as Notifications["noInternetConnection"]).behavior
          .doubleCheck
      : undefined;

  return (
    <Animated.View
      style={styles.containerNotificationItem}
      layout={LinearTransition.duration(300).springify()}
    >
      <Button
        handlePress={() => onToggleNotification(item.id)}
        replaceStyles={{ button: styles.notificationItem, textButton: {} }}
        disabled={item.id === "cryptos" && !isLoggedIn}
      >
        <Text style={styles.notificationKey}>
          {t(`notifications.${item.id}`)}
        </Text>
        <Switch
          value={item.data.enabled}
          disabled={item.id === "cryptos" && !isLoggedIn}
          onChange={() => onToggleNotification(item.id)}
        />
      </Button>

      {item.data.enabled && (
        <Animated.View
          style={styles.detailsContainer}
          layout={LinearTransition.duration(300).springify()}
          exiting={FadeOutDown.duration(300)}
          entering={FadeInDown.duration(300)}
        >
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t("settings.notificationDetails.enabled")}
            </Text>
            <Text style={styles.detailValue}>
              {formatBoolean(item.data.enabled)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t("settings.notificationDetails.paused")}
            </Text>
            <Text style={styles.detailValue}>
              {formatBoolean(paused.isPaused)}
            </Text>
          </View>
          {paused.isPaused && paused.timePaused > 0 && (
            <Animated.View
              style={styles.detailRow}
              entering={FadeInDown.duration(200)}
              exiting={FadeOutDown.duration(200)}
            >
              <Text style={styles.detailLabel}>
                {t("settings.notificationDetails.pausedUntil")}
              </Text>
              <Text style={styles.detailValue}>
                {getFormattedDate(new Date(paused.timePaused), undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </Text>
            </Animated.View>
          )}

          {item.id !== "allNotifications" &&
            item.id !== "timeToDownload" &&
            item.id !== "recorderNotification" && (
              <NotificationBehaviorSection
                reason={item.id}
                behavior={behavior}
                doubleCheck={doubleCheck}
                batteryLevel={batteryLevel}
                onUpdateNotifications={onUpdateNotifications}
              />
            )}
          {item.id === "streamers" && (
            <NotificationStreamersSection
              streamersList={streamersList}
              onToggleStreamer={onToggleStreamer}
            />
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default memoDeep(NotificationItem);
