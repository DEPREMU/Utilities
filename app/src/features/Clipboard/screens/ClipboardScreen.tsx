import {
  View,
  FlatList,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutDown,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import { useLanguage } from "@context/LanguageContext";
import { ServerError } from "@commonSrc/both/errors/Error";
import RenderClipboardItem from "@screens/Clipboard/components/RenderClipboardItem";
import { useClipboardFetch } from "../hooks/useClipboardFetch";
import { useStylesClipboardScreen } from "@screens/Clipboard/styles";
import { Timers, ServerFetch, REPLACERS } from "@common";
import { FAB, Searchbar, Switch, Text, Button } from "react-native-paper";
import { Logger, sessionManager, storageManagement } from "@utils";
import React, { useCallback, useEffect, useRef, useState } from "react";

const logger = new Logger("ClipboardScreen");

const getSkeletonData = (deleted: boolean) => {
  const createdAt = new Date().toISOString();

  return Array.from({ length: 5 }).map((_, i) => {
    const returnData: DB["TablesClient"]["ClipboardSync"] = {
      deleted,
      createdAt,
      id: `id ${i}`,
      userId: "userId",
      content: "Loading...",
      deviceId: "deviceId",
    };
    return returnData;
  });
};

const ClipboardScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesClipboardScreen();

  const { pagination, searchText, setSearchText, deleted, setDeleted } =
    useClipboardFetch();

  const [refreshing, setRefreshing] = useState(false);
  const [noMoreData, setNoMoreData] = useState<boolean>(false);
  const [isFarFromStart, setIsFarFromStart] = useState(false);
  const [clipboardData, setClipboardData] = useState<
    DB["TablesClient"]["ClipboardSync"][] | null
  >(getSkeletonData(deleted));

  const flatListRef = useRef<FlatList | null>(null);
  const isLoadingRef = useRef<boolean | null>(false);
  const isScrollingToTopRef = useRef<boolean | null>(false);

  const isLoadingSkeletonRef = useRef<boolean | null>(true);

  const idTimeoutRef = useRef<number | null>(null);
  const idTimeoutSearch = useRef<number | null>(null);

  const handleGoToTopRef = useRef(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    isScrollingToTopRef.current = true;
    setIsFarFromStart(false);
  });

  const changeClipboardItemDeleted = useCallback(
    async (id: string, deleted: boolean) => {
      if (!id) return logger.error("No ID provided for deletion");

      const { sessionToken } = sessionManager.getSessionData();

      if (!sessionToken) return logger.error("No session token available");

      const deviceId = storageManagement.get("DEVICE_ID");

      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted",
        { body: { id, deleted, deviceId } },
        sessionToken,
      );

      if ("error" in res.data) {
        logger.error(
          "Error deleting clipboard item:",
          ServerError.getMessage(res.data),
        );
        return;
      }

      setClipboardData(
        (prevData) => prevData?.filter((item) => item.id !== id) ?? null,
      );
    },
    [],
  );

  const fetchClipboard = useCallback(
    async (searchText?: string) => {
      if (pagination.isLatest) {
        if (!searchText) return;
        if (pagination.totalItems === 0) return;

        setClipboardData(
          pagination.allData.filter(
            (item) =>
              !!item.content?.toLowerCase()?.includes(searchText.toLowerCase()),
          ),
        );
        return;
      }

      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      const data = await pagination.next();

      idTimeoutRef.current = Timers.setTimeout(
        () => {
          try {
            setRefreshing(false);

            if (!data) return;

            setClipboardData(pagination.allData);
          } finally {
            isLoadingRef.current = false;
            isLoadingSkeletonRef.current = false;
          }
        },
        pagination.page >= 0 ? 100 : data ? 3000 : 2000,
      );
    },
    [pagination],
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;

      if (isScrollingToTopRef.current) {
        if (contentOffset.y <= 50) isScrollingToTopRef.current = false;
        return;
      }

      setIsFarFromStart(contentOffset.y > 500);

      if (isLoadingRef.current || pagination.isLatest) return;

      const distanceFromEnd =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      if (distanceFromEnd < 750) fetchClipboard();
    },
    [pagination, fetchClipboard, setIsFarFromStart],
  );

  const handleSearch = useCallback(
    (text: string) => {
      setSearchText(text);

      if (isLoadingSkeletonRef.current || isLoadingRef.current) return;

      Timers.clearTimeout(idTimeoutSearch.current);

      if (!pagination.isLatest || text.length < 3) pagination.clear();

      idTimeoutSearch.current = Timers.setTimeout(() => {
        fetchClipboard(text);
      }, 2000);
    },
    [fetchClipboard, setSearchText, pagination],
  );

  const handleRefresh = useCallback(() => {
    pagination.clear();

    fetchClipboard();
  }, [pagination, fetchClipboard]);

  const handleDeleteRestoreAll = useCallback(async () => {
    const { sessionToken } = sessionManager.getSessionData();
    if (!sessionToken) return logger.error("No session token available");

    const deviceId = storageManagement.get("DEVICE_ID");

    const newDeleted = !deleted;

    const res = await ServerFetch.put(
      "/clipboard/delete/toggle-deleted-all",
      {
        body: {
          restore: !newDeleted,
          deviceId,
        },
      },
      sessionToken,
    );

    if ("error" in res.data) {
      logger.error(
        "Error deleting clipboard item:",
        ServerError.getMessage(res.data),
      );
      return;
    }

    fetchClipboard(searchText);
    setDeleted(newDeleted);
  }, [deleted, searchText, setDeleted, fetchClipboard]);

  const renderItems = useCallback(
    ({ item }: { item: DB["TablesClient"]["ClipboardSync"] }) => (
      <RenderClipboardItem
        item={item}
        deleteItem={changeClipboardItemDeleted}
      />
    ),
    [changeClipboardItemDeleted],
  );

  const renderEmptyComponent = useCallback(() => {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.titleCard}>
            <Text style={styles.h3}>{t("clipboard.noClipboardData")}</Text>
          </View>
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>
              {t("clipboard.clipboardEmptyDescription")}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [t, styles]);

  useEffect(() => {
    void fetchClipboard();
  }, [fetchClipboard]);

  useEffect(() => {
    const listener = pagination.addEventListener("lastDataUpdate", (isLast) => {
      setNoMoreData(isLast);
    });

    return () => {
      listener.remove();
    };
  }, [pagination]);

  const isLoading =
    refreshing || !!isLoadingRef.current || !!isLoadingSkeletonRef.current;

  return (
    <Animated.View
      style={styles.container}
      layout={LinearTransition.duration(200).springify()}
    >
      <Animated.View
        style={styles.sectionContainer}
        layout={LinearTransition.duration(300).springify()}
      >
        <Searchbar
          value={searchText}
          style={styles.searchBar}
          editable={!isLoading}
          placeholder={t("labels.search")}
          onChangeText={handleSearch}
        />

        <View style={styles.showDeletedContainer}>
          <Text style={styles.switchLabel}>{t("common.showDeleted")}</Text>
          <Switch
            value={deleted}
            color={colors.primary}
            disabled={isLoading}
            onValueChange={setDeleted}
          />
        </View>

        <Button
          onPress={handleDeleteRestoreAll}
          mode="contained"
          buttonColor={deleted ? colors.success : colors.error}
          disabled={isLoading || !clipboardData || clipboardData.length === 0}
        >
          <Text style={styles.subtitle}>
            {t(`common.${deleted ? "restoreAll" : "deleteAll"}`)}
          </Text>
        </Button>
      </Animated.View>

      <FlatList
        nestedScrollEnabled
        ref={flatListRef}
        data={clipboardData}
        onScroll={handleScroll}
        renderItem={renderItems}
        scrollEnabled={!isLoading}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.scrollViewContentContainer}
        refreshControl={
          <RefreshControl
            enabled={!isLoading}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        }
      />

      {(noMoreData || REPLACERS.isDev) && (
        <Animated.View
          style={styles.noMoreDataContainer}
          exiting={FadeOutDown.duration(200)}
          entering={FadeInDown.duration(200)}
        >
          <Text style={styles.noMoreDataText}>{t("common.noMoreData")}</Text>
        </Animated.View>
      )}

      {isFarFromStart && (
        <Animated.View
          style={styles.FAB}
          exiting={FadeOutRight.duration(300)}
          entering={FadeInRight.duration(300)}
        >
          <FAB
            animated
            size={REPLACERS.isNative ? "small" : "medium"}
            icon="arrow-up"
            color={colors.primary}
            style={styles.FAB}
            onPress={handleGoToTopRef.current}
          />
        </Animated.View>
      )}

      {(REPLACERS.isWeb || REPLACERS.isDev) && !isFarFromStart && (
        <Animated.View
          style={styles.FAB}
          exiting={FadeOutRight.duration(300)}
          entering={FadeInRight.duration(300)}
        >
          <FAB
            animated
            size={REPLACERS.isNative ? "small" : "medium"}
            icon="refresh"
            color={colors.primary}
            style={styles.FAB}
            onPress={handleRefresh}
            disabled={isLoading}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default ClipboardScreen;
