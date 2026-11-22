import {
  Notifications,
  ReasonNotification,
  typeBehaviorBatteryNotification,
} from "@types";
import { Get, Paths } from "type-fest";
import { View } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { Switch, Text, TextInput } from "react-native-paper";
import { DATA_PLATFORM, memoDeep, REPLACERS } from "@utils";
import { useStylesNotifications } from "@screens/Settings/styles/useStylesNotifications";
import React from "react";
import Animated, {
  FadeInDown,
  FadeOutDown,
  LinearTransition,
} from "react-native-reanimated";

export type UpdateNotificationsHandler = <T extends Paths<Notifications>>(
  key: T,
  value: Get<Notifications, T> | ((prev: Notifications) => Notifications),
) => Promise<void>;

type NotificationBehaviorSectionProps = {
  reason: ReasonNotification;
  behavior: Notifications[ReasonNotification]["behavior"];
  doubleCheck?: boolean;
  batteryLevel?: typeBehaviorBatteryNotification["batteryLevel"];
  onUpdateNotifications: UpdateNotificationsHandler;
};

const normalizeRange = (value: string, min: number, max: number): number => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
};

const normalizeHour = (value: string): number => normalizeRange(value, 0, 23);

const normalizeBatteryLevel = (value: string): number =>
  normalizeRange(value, 0, 100);

const NotificationBehaviorSection: React.FC<
  NotificationBehaviorSectionProps
> = ({
  reason,
  behavior,
  doubleCheck,
  batteryLevel,
  onUpdateNotifications,
}) => {
  const { t } = useLanguage();
  const { styles } = useStylesNotifications();

  return (
    <Animated.View
      style={styles.detailSection}
      layout={LinearTransition.duration(200).springify()}
    >
      <Text style={styles.detailSectionTitle}>
        {t("settings.notificationDetails.behavior")}
      </Text>
      <View style={styles.detailGroup}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t("settings.notificationDetails.aggressive")}
          </Text>
          <Switch
            value={behavior.aggressive ?? false}
            onValueChange={(value) =>
              onUpdateNotifications(`${reason}.behavior.aggressive`, value)
            }
          />
        </View>
        <Text style={styles.detailDescription}>
          {t("settings.notificationDetails.aggressiveDescription")}
        </Text>
      </View>
      {reason === "noInternetConnection" && (
        <View style={styles.detailGroup}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t("settings.notificationDetails.doubleCheck")}
            </Text>
            <Switch
              value={doubleCheck ?? true}
              onValueChange={(value) =>
                onUpdateNotifications(
                  "noInternetConnection.behavior.doubleCheck",
                  value,
                )
              }
            />
          </View>
          <Text style={styles.detailDescription}>
            {t("settings.notificationDetails.doubleCheckDescription")}
          </Text>
        </View>
      )}
      {REPLACERS.isNative && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t("settings.notificationDetails.onlyWhenScreenOff")}
          </Text>
          <Switch
            value={behavior.onlyWhen.screenOff}
            onValueChange={(value) =>
              onUpdateNotifications(
                `${reason}.behavior.onlyWhen.screenOff`,
                value,
              )
            }
          />
        </View>
      )}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          {t("settings.notificationDetails.onlyWhenAppInBackground")}
        </Text>
        <Switch
          value={behavior.onlyWhen.appInBackground}
          onValueChange={(value) =>
            onUpdateNotifications(
              `${reason}.behavior.onlyWhen.appInBackground`,
              value,
            )
          }
        />
      </View>
      {(REPLACERS.isNative ||
        (REPLACERS.isWeb && DATA_PLATFORM.hasBattery)) && (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t("settings.notificationDetails.onlyWhenConnectedToPower")}
          </Text>
          <Switch
            value={behavior.onlyWhen.connectedToPower}
            onValueChange={(value) =>
              onUpdateNotifications(
                `${reason}.behavior.onlyWhen.connectedToPower`,
                value,
              )
            }
          />
        </View>
      )}
      {REPLACERS.isNative && (
        <>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t("settings.notificationDetails.onlyWhenNotInDoNotDisturb")}
            </Text>
            <Switch
              value={behavior.onlyWhen.notInDoNotDisturb}
              onValueChange={(value) =>
                onUpdateNotifications(
                  `${reason}.behavior.onlyWhen.notInDoNotDisturb`,
                  value,
                )
              }
            />
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t("settings.notificationDetails.bypassDoNotDisturb")}
            </Text>
            <Switch
              value={behavior.bypassDoNotDisturb}
              onValueChange={(value) =>
                onUpdateNotifications(
                  `${reason}.behavior.bypassDoNotDisturb`,
                  value,
                )
              }
            />
          </View>
        </>
      )}
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>
          {t("settings.notificationDetails.onlyDuringSpecificHours")}
        </Text>
        <Switch
          value={behavior.onlyWhen.specificHours.enabled}
          onValueChange={(value) =>
            onUpdateNotifications(
              `${reason}.behavior.onlyWhen.specificHours.enabled`,
              value,
            )
          }
        />
      </View>
      {behavior.onlyWhen.specificHours.enabled && (
        <Animated.View
          style={styles.detailRow}
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(200)}
        >
          <TextInput
            value={String(behavior.onlyWhen.specificHours.startHour)}
            onChangeText={(text) =>
              onUpdateNotifications(
                `${reason}.behavior.onlyWhen.specificHours.startHour`,
                normalizeHour(text),
              )
            }
            keyboardType="numeric"
            label={t("settings.notificationDetails.startHour")}
            style={styles.detailInput}
          />
          <TextInput
            value={String(behavior.onlyWhen.specificHours.endHour)}
            onChangeText={(text) =>
              onUpdateNotifications(
                `${reason}.behavior.onlyWhen.specificHours.endHour`,
                normalizeHour(text),
              )
            }
            keyboardType="numeric"
            label={t("settings.notificationDetails.endHour")}
            style={styles.detailInput}
          />
        </Animated.View>
      )}
      {reason === "batteryAlerts" && batteryLevel && (
        <View style={styles.detailRow}>
          <TextInput
            value={String(batteryLevel.min)}
            onChangeText={(text) =>
              onUpdateNotifications(
                "batteryAlerts.behavior.batteryLevel.min",
                normalizeBatteryLevel(text),
              )
            }
            keyboardType="numeric"
            label={t("settings.notificationDetails.minBatteryLevel")}
            style={styles.detailInput}
          />
          <TextInput
            value={String(batteryLevel.max)}
            onChangeText={(text) =>
              onUpdateNotifications(
                "batteryAlerts.behavior.batteryLevel.max",
                normalizeBatteryLevel(text),
              )
            }
            keyboardType="numeric"
            label={t("settings.notificationDetails.maxBatteryLevel")}
            style={styles.detailInput}
          />
        </View>
      )}
    </Animated.View>
  );
};

export default memoDeep(NotificationBehaviorSection);
