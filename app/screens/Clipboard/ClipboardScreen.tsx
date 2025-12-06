import {
  logError,
  fetchToServer,
  loadDataSecure,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import { Text } from "react-native-paper";
import { Tables } from "@types";
import * as Clipboard from "expo-clipboard";
import { useLanguage } from "@context/LanguageContext";
import { FlatList, View } from "react-native";
import { useUserContext } from "@context/UserContext";
import RenderClipboardItem from "@components/Clipboard/RenderClipboardItem";
import useStylesClipboardScreen from "@styles/screens/clipboard/useStylesClipboardScreen";
import React, { useCallback, useEffect, useRef, useState } from "react";

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

  const idTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  const deleteClipboardItem = useCallback(
    async (id: string) => {
      if (!id) return logError("No ID provided for deletion");
      if (!sessionToken) return logError("No session token available");

      const deviceId = await loadDataSecure("_deviceId");

      const res = await fetchToServer(
        "/database/update",
        {
          lang: language,
          deviceId: deviceId || "local-device",
          match: { id },
          table: "ClipboardSync",
          values: { deleted: true },
        },
        sessionToken,
      );

      const { error } = res.data || { error: res.errorText || "Unknown error" };

      if (error) {
        logError("Error deleting clipboard item:", error);
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

      const deviceId = await loadDataSecure("_deviceId");

      const res = await fetchToServer(
        "/database/fetch",
        {
          table: "ClipboardSync",
          deviceId: deviceId || "local-device",
          match: { userId: userData?.userId, deleted: false },
          lang: language,
        },
        sessionToken,
      );

      const { data, error } = res.data || {
        error: res.errorText || "Unknown error",
      };

      if (error) {
        logError("Error fetching clipboard data:", error);
        return;
      }

      if (idTimeoutRef.current) {
        clearTimeoutPolyfill(idTimeoutRef.current as NodeJS.Timeout);
        idTimeoutRef.current = null;
      }
      idTimeoutRef.current = setTimeoutPolyfill(
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
    return () => {
      if (!idTimeoutRef.current) return;

      clearTimeoutPolyfill(idTimeoutRef.current as NodeJS.Timeout);
      idTimeoutRef.current = null;
    };
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
