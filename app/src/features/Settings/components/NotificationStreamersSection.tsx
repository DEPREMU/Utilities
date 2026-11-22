import { memoDeep } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import { Switch, Text } from "react-native-paper";
import { typeStreamerNotification } from "@types";
import { useStylesNotifications } from "@screens/Settings/styles/useStylesNotifications";
import React from "react";
import Animated, {
  FadeInDown,
  FadeOutDown,
  LinearTransition,
} from "react-native-reanimated";

type NotificationStreamersSectionProps = {
  streamersList: typeStreamerNotification[];
  onToggleStreamer: (streamer: typeStreamerNotification) => void;
};

const NotificationStreamersSection: React.FC<
  NotificationStreamersSectionProps
> = ({ streamersList, onToggleStreamer }) => {
  const { t } = useLanguage();
  const { styles } = useStylesNotifications();

  return (
    <Animated.View
      style={styles.detailSection}
      layout={LinearTransition.duration(200).springify()}
    >
      <Text style={styles.detailSectionTitle}>
        {t("settings.notificationDetails.streamers")}
      </Text>
      {streamersList.length ? (
        streamersList.map((streamer) => (
          <Animated.View
            style={styles.detailRow}
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(200)}
            key={streamer.name}
          >
            <Text style={styles.detailLabel}>{streamer.name}</Text>
            <Switch
              value={streamer.enabled}
              onValueChange={() => onToggleStreamer(streamer)}
            />
          </Animated.View>
        ))
      ) : (
        <Text style={styles.detailValue}>
          {t("settings.notificationDetails.noStreamers")}
        </Text>
      )}
    </Animated.View>
  );
};

export default memoDeep(NotificationStreamersSection);
