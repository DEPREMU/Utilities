import { Text } from "react-native-paper";
import { openURL } from "@utils";
import { useLanguage } from "@/context/LanguageContext";
import { FlatList, View } from "react-native";
import React, { useCallback, useRef } from "react";
import { Tables, DownDetector } from "@types";
import RenderDownDetectorItemMemo from "@/features/DownDetector/components/RenderDownDetectorItem";
import useStylesDownDetectorScreen from "@/features/DownDetector/styles/useStylesDownDetectorScreen";

interface DownDetectorScreenProps {
  downDetectorData?: DownDetector[] | null;
  deleteDownDetectorItem: (id: string) => void;
  handleSendNotification: (id: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const tableName: keyof Tables = "DownDetector";
const DownDetectorScreen: React.FC<DownDetectorScreenProps> = ({
  downDetectorData,
  deleteDownDetectorItem,
  handleSendNotification,
}) => {
  const { t } = useLanguage();
  const { styles } = useStylesDownDetectorScreen();

  const visitWebsiteRef = useRef(async (url: string) => {
    if (!url) return;
    openURL(url);
  });

  const renderItems = useCallback(
    ({ item }: { item: Tables[typeof tableName] }) => (
      <RenderDownDetectorItemMemo
        key={item.id || Math.random().toString()}
        item={item}
        title={t("downDetectorTitle")}
        removeLabel={t("remove")}
        deleteItem={deleteDownDetectorItem}
        visitWebsite={visitWebsiteRef.current}
        handleSendNotification={handleSendNotification}
        visitWebsiteLabel={t("visitWebsite")}
      />
    ),
    [t, deleteDownDetectorItem, handleSendNotification],
  );

  const renderEmptyComponent = useCallback(() => {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.titleCard}>
            <Text style={styles.buttonText}>{t("noDownDetectorData")}</Text>
          </View>
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>
              {t("downDetectorEmptyDescription")}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [t, styles]);

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.containerFlatList}
        contentContainerStyle={styles.contentContainer}
        data={downDetectorData}
        keyExtractor={(item) => String(item.id || Math.random())}
        renderItem={renderItems}
        ListEmptyComponent={renderEmptyComponent}
      />
    </View>
  );
};

export default DownDetectorScreen;
