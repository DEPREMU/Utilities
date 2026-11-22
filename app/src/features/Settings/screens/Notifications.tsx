import NotificationItem, {
  NotificationListItem,
} from "@screens/Settings/components/NotificationItem";
import {
  Notifications,
  ReasonNotification,
  typeStreamerNotification,
} from "@types";
import {
  memoDeep,
  navigation,
  sessionManager,
  askForPermission,
  notificationsManager,
} from "@utils";
import { cloneDeep } from "lodash";
import { Get, Paths } from "type-fest";
import { useUserContext } from "@context/UserContext";
import { getValueState, Helper } from "@common";
import { useStylesNotifications } from "@screens/Settings/styles/useStylesNotifications";
import Animated, { LinearTransition } from "react-native-reanimated";
import React, { useMemo, useState, useCallback } from "react";

const NotificationsScreen: React.FC = () => {
  const { styles } = useStylesNotifications();
  const { isLoggedIn } = useUserContext();

  const [notifications, setNotifications] = useState<Notifications>(
    notificationsManager.getNotifications(),
  );

  const handleToggleNotification = useCallback(
    async (reason: ReasonNotification) => {
      if (reason === "cryptos" && !sessionManager.getSessionData().isLoggedIn)
        return navigation.replace("Login");
      if (reason === "locationEnabled") {
        const granted = await askForPermission("location", {
          overrideDoNotAskAgain: true,
        });
        if (!granted) return;
      }

      await notificationsManager.toggleNotification(reason);

      setNotifications(notificationsManager.getNotifications());
    },
    [],
  );

  const handleUpdateNotifications = useCallback(
    async <T extends Paths<Notifications>>(
      key: T,
      value: Get<Notifications, T> | ((prev: Notifications) => Notifications),
    ) => {
      const endsWithByPassDND = key.endsWith("behavior.bypassDoNotDisturb");

      if (endsWithByPassDND) {
        const granted = await askForPermission("doNotDisturb", {
          overrideDoNotAskAgain: true,
        });
        if (!granted) return;
      }

      notificationsManager.editNotifications((prev) => {
        const clonedPrev = cloneDeep(prev) as Notifications;
        const newValue = getValueState(
          value as never,
          () => clonedPrev,
        ) as never;

        const newSettings = Helper.Object.setValue(clonedPrev, key, newValue);

        const reason = key.split(".")[0] as ReasonNotification;
        if (
          endsWithByPassDND &&
          Helper.Object.getValue(
            newSettings,
            `${reason}.behavior.onlyWhen.notInDoNotDisturb`,
          )
        )
          Helper.Object.setValue(
            newSettings,
            `${reason}.behavior.onlyWhen.notInDoNotDisturb`,
            !newValue,
          );
        else if (
          key.endsWith("onlyWhen.notInDoNotDisturb") &&
          Helper.Object.getValue(
            newSettings,
            `${reason}.behavior.bypassDoNotDisturb`,
          )
        )
          Helper.Object.setValue(
            newSettings,
            `${reason}.behavior.bypassDoNotDisturb`,
            !newValue,
          );

        setNotifications(newSettings);

        return newSettings;
      });
    },
    [],
  );

  const handleToggleStreamer = useCallback(
    async (streamer: typeStreamerNotification) => {
      await handleUpdateNotifications("streamers.streamersList", (prev) => {
        const streamersList = Helper.Object.getValue(
          prev,
          "streamers.streamersList",
          [],
        ).filter((v) =>
          v.name === streamer.name
            ? Helper.Object.setValue(v, "enabled", !streamer.enabled)
            : v,
        );
        const newSettings = Helper.Object.setValue(
          prev,
          "streamers.streamersList",
          streamersList,
        );

        return newSettings;
      });
    },
    [handleUpdateNotifications],
  );

  const notificationData: NotificationListItem[] = useMemo(() => {
    return Object.keys(notifications)
      .reduce((acc, reason) => {
        const reasonKey = reason as ReasonNotification;
        acc.push({
          id: reasonKey,
          data:
            notifications?.[reasonKey] ||
            notificationsManager.getNotification(reasonKey),
        });
        return acc;
      }, [] as NotificationListItem[])
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [notifications]);

  const renderNotificationItem = useCallback(
    ({ item }: { item: NotificationListItem }) => {
      return (
        <NotificationItem
          item={item}
          isLoggedIn={isLoggedIn}
          onToggleNotification={handleToggleNotification}
          onUpdateNotifications={handleUpdateNotifications}
          onToggleStreamer={handleToggleStreamer}
        />
      );
    },
    [
      isLoggedIn,
      handleToggleStreamer,
      handleToggleNotification,
      handleUpdateNotifications,
    ],
  );

  return (
    <Animated.View
      style={styles.container}
      layout={LinearTransition.duration(300).springify()}
    >
      <Animated.FlatList
        data={notificationData}
        style={styles.containerFlatList}
        layout={LinearTransition.duration(300).springify()}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.contentContainer}
      />
    </Animated.View>
  );
};

export default memoDeep(NotificationsScreen);
