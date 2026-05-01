import Animated, {
  FadeInUp,
  withSpring,
  FadeOutDown,
  useSharedValue,
  WithSpringConfig,
  useAnimatedStyle,
  LinearTransition,
} from "react-native-reanimated";
import { useLanguage } from "@context/LanguageContext";
import { memoDeep, tTyped } from "@utils";
import { useStylesSyncScreen } from "../styles/useStylesSyncScreen";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Divider, Modal, Portal } from "react-native-paper";

type SyncScreenProps = {
  visible: boolean;
  /**
   * If not provided, it will use the default title from translations ("Syncing..."). Every second, the dots will be added to the title to indicate that the syncing is in progress. If a custom title is provided, the dots will not be added, and the title will remain static. This allows for flexibility in case different contexts require a different title.
   */
  title?: string;
  /**
   * An optional description to provide more details about the syncing process. If not provided, only the title will be displayed. This can be useful for giving users additional information about what is being synced or any specific instructions they might need to follow during the syncing process.
   */
  description?: string;
};

const SyncScreen: React.FC<SyncScreenProps> = ({
  title,
  visible,
  description,
}) => {
  const { t } = useLanguage();
  const { styles, height } = useStylesSyncScreen();

  const [syncing, setSyncing] = useState(title || t("common.syncing"));

  const yValue = useSharedValue(height * 2);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: yValue.value }],
    minHeight: 400,
  }));

  useEffect(() => {
    if (title) {
      setSyncing(title);
      return;
    }
    if (!visible) return;

    let dots = 0;

    const interval = setInterval(() => {
      setSyncing(tTyped("common.syncing").replace("...", ".".repeat(dots % 4)));
      dots = (dots + 1) % 4;
    }, 1000);

    return () => clearInterval(interval);
  }, [visible, title]);

  useEffect(() => {
    const options: WithSpringConfig = { duration: 400 };

    if (!visible) {
      setSyncing("");
      yValue.value = withSpring(height * 2, options);
      return;
    }

    yValue.value = withSpring(0, options);
  }, [visible, height, yValue]);

  return (
    <Portal>
      <Modal visible dismissable={false} contentContainerStyle={styles.flex}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <Animated.View
            style={styles.contentContainer}
            layout={LinearTransition.duration(300).springify()}
          >
            <Animated.View
              style={styles.rowSwitchText}
              exiting={FadeOutDown.duration(200).springify()}
              entering={FadeInUp.duration(200).springify()}
            >
              <Animated.Text style={styles.title}>{syncing}</Animated.Text>

              <ActivityIndicator size="small" />
            </Animated.View>

            <Divider style={styles.divider} />

            {!!description && (
              <Animated.Text
                style={styles.h3}
                exiting={FadeOutDown.duration(200).springify()}
                entering={FadeInUp.duration(200).springify()}
              >
                {description}
              </Animated.Text>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </Portal>
  );
};

export default memoDeep(SyncScreen);
