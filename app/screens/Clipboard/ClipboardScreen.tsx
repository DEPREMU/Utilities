import { Text } from "react-native-paper";
import {
  RequestDatabaseFetch,
  RequestDatabaseUpdate,
  ResponseDatabaseFetch,
  ResponseDatabaseUpdate,
  Tables,
} from "@types";
import { fetchOptions, getRouteAPI, logError } from "@utils";
import * as Clipboard from "expo-clipboard";
import { useLanguage } from "@context/LanguageContext";
import { FlatList, View } from "react-native";
import { useUserContext } from "@context/UserContext";
import RenderClipboardItem from "@components/Clipboard/RenderClipboardItem";
import useStylesClipboardScreen from "@/styles/screens/clipboard/useStylesClipboardScreen";
import React, { useCallback, useEffect, useState } from "react";
import chalk from "chalk";

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
  const { t, language } = useLanguage();
  const { styles } = useStylesClipboardScreen();
  const { userData, sessionToken } = useUserContext();

  const [clipboardData, setClipboardData] = useState<
    Tables["ClipboardSync"][] | null
  >(skeletonData);

  const deleteClipboardItem = useCallback(
    async (id: string) => {
      if (!id) return logError("No ID provided for deletion");
      if (!sessionToken) return logError("No session token available");

      const { error } = (await fetch(
        await getRouteAPI("/database/update"),
        fetchOptions<RequestDatabaseUpdate<"ClipboardSync">>(
          "POST",
          {
            lang: language,
            match: { id },
            table: "ClipboardSync",
            values: { deleted: true },
          },
          sessionToken,
        ),
      ).then((res) => res.json())) as ResponseDatabaseUpdate<"ClipboardSync">;

      if (error) {
        logError(chalk.red("Error deleting clipboard item:"), error);
        return;
      }

      setClipboardData(
        (prevData) => prevData?.filter((item) => item.id !== id) ?? null,
      );
    },
    [sessionToken, language],
  );

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
  const renderEmptyComponent = useCallback(() => {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.titleCard}>
            <Text style={styles.buttonText}>{t("noClipboardData")}</Text>
          </View>
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>
              {t("clipboardEmptyDescription")}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [t, styles]);

  useEffect(() => {
    if (!userData?.userId) return;

    const fetchClipboardFromDatabase = async () => {
      if (!sessionToken) return logError("No session token available");

      const res = await fetch(
        await getRouteAPI("/database/fetch"),
        fetchOptions<RequestDatabaseFetch<"ClipboardSync">>(
          "POST",
          {
            table: "ClipboardSync",
            match: { userId: userData?.userId, deleted: false },
            lang: language,
          },
          sessionToken,
        ),
      );

      const { data, error } =
        (await res.json()) as ResponseDatabaseFetch<"ClipboardSync">;

      if (error) {
        logError("Error fetching clipboard data:", error);
        return;
      }

      setTimeout(
        () => {
          if (!data) return setClipboardData(null);

          setClipboardData(
            (Array.isArray(data) ? data : [data]).sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt),
            ) ?? null,
          );
        },
        data ? 3000 : 2000,
      );
    };

    fetchClipboardFromDatabase();
  }, [userData?.userId, sessionToken, language]);

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.containerFlatList}
        contentContainerStyle={styles.contentContainer}
        data={clipboardData}
        keyExtractor={(item) => String(item.id || Math.random())}
        renderItem={renderItems}
        ListEmptyComponent={renderEmptyComponent}
      />
    </View>
  );
};

export default ClipboardScreen;
