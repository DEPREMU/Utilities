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

  const pageRef = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);
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

  const fetchClipboardFromDatabase = useCallback(async () => {
    if (isLoadingRef.current) return;
    if (!sessionToken || !userData?.userId)
      return logError("No session token or user ID available");

    isLoadingRef.current = true;

    const deviceId = await loadDataSecure("_deviceId");

    const res = await fetchToServer(
      "/database/fetch",
      {
        lang: language,
        limit: 20,
        table: "ClipboardSync",
        match: { userId: userData?.userId, deleted: false },
        offset: pageRef.current * 20,
        orderBy: "createdAt",
        deviceId: deviceId || "local-device",
        pagination: true,
        orderDirection: "DESC",
      },
      sessionToken,
    );

    const { data, error } = res.data || {
      error: res.errorText || "Unknown error",
    };

    if (error) {
      logError("Error fetching clipboard data:", error);
      isLoadingRef.current = false;
      return;
    }

    if (idTimeoutRef.current) {
      clearTimeoutPolyfill(idTimeoutRef.current as NodeJS.Timeout);
      idTimeoutRef.current = null;
    }
    idTimeoutRef.current = setTimeoutPolyfill(
      () => {
        if (!data) {
          setClipboardData((prev) => prev ?? []);
          isLoadingRef.current = false;
          return;
        }
        pageRef.current += 1;

        setClipboardData((prev) => (prev ? [...prev, ...data] : [...data]));
        isLoadingRef.current = false;
      },
      pageRef.current > 0 ? 100 : data ? 3000 : 2000,
    );
  }, [sessionToken, userData?.userId, language]);

  const copyClipboardContent = useCallback(async (content: string) => {
    if (!content) return logError("No content provided for copying");

    await Clipboard.setStringAsync(content);
  }, []);

  const renderItems = useCallback(
    ({ item }: { item: Tables["ClipboardSync"] }) => (
      <RenderClipboardItem
        key={item.id || Math.random().toString(36)}
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
    fetchClipboardFromDatabase();
    return () => {
      if (!idTimeoutRef.current) return;

      clearTimeoutPolyfill(idTimeoutRef.current as NodeJS.Timeout);
      idTimeoutRef.current = null;
    };
  }, [fetchClipboardFromDatabase]);

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.containerFlatList}
        contentContainerStyle={styles.contentContainer}
        data={clipboardData}
        keyExtractor={(item) => String(item.id || Math.random())}
        renderItem={renderItems}
        ListEmptyComponent={renderEmptyComponent}
        onEndReached={fetchClipboardFromDatabase}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
};

export default ClipboardScreen;
