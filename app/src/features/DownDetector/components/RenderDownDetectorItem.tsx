import Animated, {
  FadeInLeft,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import { Tables } from "@types";
import { memoDeep } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import React, { useCallback } from "react";
import { Switch, Text, Button, FAB } from "react-native-paper";
import { useStylesDownDetectorScreen } from "@screens/DownDetector/styles/useStylesDownDetectorScreen";
import { useDownDetector } from "../services/zustand";
import SkeletonLoadingMemo from "@/common/components/SkeletonLoading";

interface RenderDownDetectorItemProps {
  item: Tables["DownDetector"];
}

const RenderDownDetectorItem: React.FC<RenderDownDetectorItemProps> = ({
  item,
}) => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesDownDetectorScreen();
  const deleteItem = useDownDetector((s) => s.deleteItem);
  const visitWebsite = useDownDetector((s) => s.visitLink);
  const handleSendNotification = useDownDetector(
    (s) => s.handleSendNotification,
  );

  const handlePressOpenURL = useCallback(() => {
    visitWebsite(item.url);
  }, [item.url, visitWebsite]);

  const toggleSendNotification = useCallback(() => {
    handleSendNotification(item.id || "");
  }, [item.id, handleSendNotification]);

  const handleDeleteItem = useCallback(() => {
    deleteItem(item.id || "");
  }, [item.id, deleteItem]);

  const disabled = !item.id;

  return (
    <Animated.View
      style={styles.sectionContainer}
      layout={LinearTransition.duration(300).springify()}
      exiting={FadeOutRight.duration(200).springify()}
      entering={FadeInLeft.duration(200).springify()}
    >
      <Animated.View style={[styles.rowSwitchText, styles.sectionContainer]}>
        <SkeletonLoadingMemo
          width="50%"
          height={(styles.title.fontSize || 20) * 1.2}
          showChildren={!disabled}
        >
          <Animated.Text style={styles.title} numberOfLines={1}>
            {item.url}
          </Animated.Text>
        </SkeletonLoadingMemo>

        <FAB
          size="small"
          icon="delete"
          color={colors.error}
          onPress={handleDeleteItem}
          disabled={disabled}
        />
      </Animated.View>

      <Animated.View
        style={[styles.rowSwitchText, styles.sectionContainer]}
        layout={LinearTransition.duration(300).springify()}
      >
        <Text style={styles.subtitle}>
          {t("notifications.sendNotification")}
        </Text>

        <Switch
          value={item.sendNotification}
          disabled={disabled}
          onValueChange={toggleSendNotification}
        />
      </Animated.View>

      <Button mode="contained" onPress={handlePressOpenURL} disabled={disabled}>
        <Text style={styles.subtitle}>{t("common.visitWebsite")}</Text>
      </Button>
    </Animated.View>
  );
};

export default memoDeep(RenderDownDetectorItem);
