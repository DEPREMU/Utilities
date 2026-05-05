import { Text } from "react-native-paper";
import { View } from "react-native";
import { Tables } from "@types";
import { useLanguage } from "@context/LanguageContext";
import { useDownDetector } from "../services/zustand";
import React, { useCallback } from "react";
import RenderDownDetectorItemMemo from "@screens/DownDetector/components/RenderDownDetectorItem";
import Animated, { LinearTransition } from "react-native-reanimated";
import { useStylesDownDetectorScreen } from "@screens/DownDetector/styles/useStylesDownDetectorScreen";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const tableName: keyof Tables = "DownDetector";
const DownDetectorScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesDownDetectorScreen();

  const data = useDownDetector((s) => s.data);

  const renderItems = useCallback(
    ({ item }: { item: Tables[typeof tableName] }) => (
      <RenderDownDetectorItemMemo item={item} />
    ),
    [],
  );

  const renderEmptyComponent = useCallback(() => {
    return (
      <View style={styles.container}>
        <View style={styles.sectionContainer}>
          <Text style={styles.title}>{t("DownDetector.noDataAvailable")}</Text>

          <Text style={styles.contentText}>
            {t("DownDetector.emptyDescription")}
          </Text>
        </View>
      </View>
    );
  }, [t, styles]);

  return (
    <View style={styles.container}>
      <Animated.Text style={styles.title}>
        {t("DownDetector.title")}
      </Animated.Text>

      <Animated.FlatList
        data={data}
        style={styles.scrollViewContainer}
        layout={LinearTransition.duration(300).springify()}
        renderItem={renderItems}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.scrollViewContentContainer}
      />
    </View>
  );
};

export default DownDetectorScreen;
