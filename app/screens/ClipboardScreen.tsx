import { Tables } from "@types";
import * as Clipboard from "expo-clipboard";
import { useLanguage } from "@context/LanguageContext";
import { FlatList, View } from "react-native";
import { useUserContext } from "@context/UserContext";
import RenderClipboardItem from "@components/Clipboard/RenderClipboardItem";
import useStylesClipboardScreen from "@styles/screens/useStylesClipboardScreen";
import React, { useCallback, useEffect, useState } from "react";
import { fetchFromTable, logError, updateInTable } from "@utils";

const skeletonData: Tables["ClipboardSync"][] = Array.from({ length: 5 }).map(
  () =>
    ({
      content: "Loading...",
      userId: "userId",
      createdAt: new Date().toISOString(),
      deviceId: "deviceId",
      deleted: false,
    }) as Tables["ClipboardSync"],
);

const ClipboardScreen: React.FC = () => {
  const { userData } = useUserContext();
  const { t } = useLanguage();
  const { styles } = useStylesClipboardScreen();

  const [clipboardData, setClipboardData] = useState<
    Tables["ClipboardSync"][] | null
  >(skeletonData);

  const deleteClipboardItem = useCallback(async (id: string) => {
    if (!id) return logError("No ID provided for deletion");

    const { error } = await updateInTable(
      "ClipboardSync",
      { deleted: true },
      { id: id },
    );

    if (error) {
      console.error("Error deleting clipboard item:", error);
      return;
    }

    setClipboardData(
      (prevData) => prevData?.filter((item) => item.id !== id) ?? null,
    );
  }, []);

  const copyClipboardContent = useCallback(async (content: string) => {
    if (!content) return logError("No content provided for copying");

    await Clipboard.setStringAsync(content);
  }, []);

  const renderItems = useCallback(
    ({ item }: { item: Tables["ClipboardSync"] }) => (
      <RenderClipboardItem
        key={item.id || Math.random().toString()}
        item={item}
        title={t("clipboardTitle")}
        removeLabel={t("remove")}
        copyLabel={t("copy")}
        deleteItem={deleteClipboardItem}
        copyContent={copyClipboardContent}
      />
    ),
    [t, deleteClipboardItem, copyClipboardContent],
  );

  useEffect(() => {
    if (!userData?.uid) return;

    const fetchClipboardFromSupabase = async () => {
      const { data, error } = await fetchFromTable<Tables["ClipboardSync"]>(
        "ClipboardSync",
        {
          userId: userData?.uid,
        },
      );

      if (error) {
        console.error("Error fetching clipboard data:", error);
        return;
      }

      setTimeout(() => setClipboardData(data ?? null), 3000);
    };

    fetchClipboardFromSupabase();
  }, [userData?.uid]);

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.containerFlatList}
        contentContainerStyle={styles.contentContainer}
        data={clipboardData}
        keyExtractor={(item) => String(item.id || Math.random())}
        renderItem={renderItems}
      />
    </View>
  );
};

export default ClipboardScreen;
