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
import RenderClipboardItem from "@screens/Clipboard/components/RenderClipboardItem";
import { useStylesClipboardScreen } from "@screens/Clipboard/styles";
import { Timers, REPLACERS, ServerFetch } from "@common";
import { sessionManager, storageManagement } from "@utils";
import { FAB, Searchbar, Switch, Text, Button } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

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

const limitLoadMore = REPLACERS.isWeb ? 20 : 15;

const ClipboardScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesClipboardScreen();

  const [deleted, setDeleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState<string>("");
  const [noMoreData, setNoMoreData] = useState<boolean>(false);
  const [isFarFromStart, setIsFarFromStart] = useState(false);
  const [searchData, setSearchData] = useState<
    DB["TablesClient"]["ClipboardSync"][] | null
  >(null);
  const [clipboardData, setClipboardData] = useState<
    DB["TablesClient"]["ClipboardSync"][] | null
  >(getSkeletonData(deleted));

  const pageRef = useRef<number | null>(1);
  const deletedRef = useRef<boolean | null>(deleted);
  const flatListRef = useRef<FlatList | null>(null);
  const isLoadingRef = useRef<boolean | null>(false);
  const pageRefSearch = useRef<number | null>(1);
  const hasNoMoreData = useRef<boolean | null>(false);
  const prevSearchTextRef = useRef<string | null>("");
  const hasNoMoreDataSearch = useRef<boolean | null>(false);
  const isScrollingToTopRef = useRef<boolean | null>(false);
  const allClipboardDataRef = useRef<
    DB["TablesClient"]["ClipboardSync"][] | null
  >(null);
  const isLoadingSkeletonRef = useRef<boolean | null>(true);

  const idTimeoutRef = useRef<number | null>(null);
  const idTimeoutSearch = useRef<number | null>(null);

  const setDefaultStates = useRef<null | ((setNull?: boolean) => void)>(
    (setNull?: boolean) => {
      if (!setNull) {
        setSearchText("");
        setSearchData(null);
        setRefreshing(false);
        setNoMoreData(false);
        setClipboardData(getSkeletonData(!!deletedRef.current));
      }

      pageRef.current = setNull ? null : 1;
      isLoadingRef.current = setNull ? null : false;
      pageRefSearch.current = setNull ? null : 1;
      hasNoMoreData.current = setNull ? null : false;
      prevSearchTextRef.current = setNull ? null : "";
      hasNoMoreDataSearch.current = setNull ? null : false;
      allClipboardDataRef.current = null;
      isLoadingSkeletonRef.current = setNull ? null : true;
    },
  );

  const changeClipboardItemDeletedRef = useRef(
    async (id: string, deleted: boolean) => {
      if (!id) return REPLACERS.Logger.error("No ID provided for deletion");

      const { sessionToken } = sessionManager.getSessionData();

      if (!sessionToken)
        return REPLACERS.Logger.error("No session token available");

      const deviceId = storageManagement.get("DEVICE_ID");

      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted",
        { body: { id, deleted, deviceId } },
        sessionToken,
      );

      const { error } = res.data || { error: "Unknown error" };

      if (error) {
        REPLACERS.Logger.error("Error deleting clipboard item:", error);
        return;
      }

      setClipboardData(
        (prevData) => prevData?.filter((item) => item.id !== id) ?? null,
      );
    },
  );

  const fetchClipboardFromDatabaseRef = useRef(async (searchText?: string) => {
    if (
      isLoadingRef.current ||
      hasNoMoreData.current ||
      hasNoMoreDataSearch.current
    )
      return;

    const { userData, sessionToken } = sessionManager.getSessionData();
    if (!sessionToken || !userData?.userId) return;

    const deviceId = storageManagement.get("DEVICE_ID");

    isLoadingRef.current = true;
    setNoMoreData(false);

    const page = (searchText ? pageRefSearch.current : pageRef.current) || 1;
    if (page === 1) {
      isLoadingSkeletonRef.current = true;
      if (searchText) setSearchData(getSkeletonData(!!deletedRef.current));
      else setClipboardData(getSkeletonData(!!deletedRef.current));
    }

    const res = await ServerFetch.get(
      "/clipboard/:deviceId{/:page}",
      {
        params: {
          page: page,
          deviceId,
        },
        query: {
          query: searchText || undefined,
          deleted: deletedRef.current || undefined,
        },
      },
      sessionToken,
    );

    const handleSetVars = (data?: DB["TablesClient"]["ClipboardSync"][]) => {
      isLoadingRef.current = false;
      setRefreshing(false);

      const prevIsLoadingSkeleton = isLoadingSkeletonRef.current;
      isLoadingSkeletonRef.current = false;

      if (!data) return;

      const refSet = searchText ? setSearchData : setClipboardData;
      refSet((prev) => {
        const oldData = prevIsLoadingSkeleton ? [] : prev || [];

        const newData = [...oldData];

        data.forEach((item) => {
          if (!newData.some((i) => i.id === item.id)) newData.push(item);
        });

        allClipboardDataRef.current = newData;
        return newData;
      });

      if (data.length === 0 || data.length < limitLoadMore) {
        setNoMoreData(true);
        if (searchText) hasNoMoreDataSearch.current = true;
        else hasNoMoreData.current = true;
      } else {
        if (searchText) pageRefSearch.current = page + 1;
        else pageRef.current = page + 1;
      }
    };

    if ("error" in res.data) {
      REPLACERS.Logger.error("Error fetching clipboard data:", res.data.error);
      handleSetVars();
      return;
    }

    const data = res.data.clipboardItems;

    Timers.clearTimeout(idTimeoutRef.current);

    idTimeoutRef.current = Timers.setTimeout(
      () => handleSetVars(data || undefined),
      page > 0 ? 100 : data ? 3000 : 2000,
    );
  });

  const handleScrollRef = useRef(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;

      if (isScrollingToTopRef.current) {
        if (contentOffset.y <= 50) isScrollingToTopRef.current = false;
        return;
      }

      setIsFarFromStart(contentOffset.y > 500);

      if (isLoadingRef.current || hasNoMoreData.current) return;

      const distanceFromEnd =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      if (distanceFromEnd < 750) fetchClipboardFromDatabaseRef.current();
    },
  );

  const handleRefreshRef = useRef(() => {
    setDefaultStates.current?.();

    fetchClipboardFromDatabaseRef.current();
  });

  const handleGoToTopRef = useRef(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    isScrollingToTopRef.current = true;
    setIsFarFromStart(false);
  });

  const handleSearchingRef = useRef((text: string) => {
    setSearchText(text);

    const prevSearch = prevSearchTextRef.current || "";
    prevSearchTextRef.current = text;

    if (isLoadingSkeletonRef.current || isLoadingRef.current) return;

    if (text.length < 3) {
      setSearchData(null);
      hasNoMoreDataSearch.current = false;
      return;
    }

    if (hasNoMoreData.current)
      return setSearchData(
        allClipboardDataRef.current?.filter(
          (item) => !!item.content?.toLowerCase()?.includes(text.toLowerCase()),
        ) || [],
      );
    if (hasNoMoreDataSearch.current) {
      if (text.includes(prevSearch) || prevSearch.includes(text)) {
        return setSearchData(
          allClipboardDataRef.current?.filter(
            (item) =>
              !!item.content?.toLowerCase()?.includes(text.toLowerCase()),
          ) || [],
        );
      } else {
        hasNoMoreDataSearch.current = false;
        pageRefSearch.current = 0;
        setSearchData(getSkeletonData(!!deletedRef.current));
      }
    }

    Timers.clearTimeout(idTimeoutSearch.current);

    idTimeoutSearch.current = Timers.setTimeout(() => {
      fetchClipboardFromDatabaseRef.current(text);
    }, 2000);
  });

  const handleDeleteRestoreAll = useCallback(async () => {
    const { sessionToken } = sessionManager.getSessionData();
    if (!sessionToken)
      return REPLACERS.Logger.error("No session token available");

    const deviceId = storageManagement.get("DEVICE_ID");

    const newDeleted = !deletedRef.current;

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

    const { error } = res.data || { error: "Unknown error" };

    if (error) {
      REPLACERS.Logger.error("Error deleting clipboard item:", error);
      return;
    }

    fetchClipboardFromDatabaseRef.current(searchText);
    setDeleted(newDeleted);
    setDefaultStates.current?.();
    deletedRef.current = newDeleted;
  }, [searchText]);

  const renderItems = useCallback(
    ({ item }: { item: DB["TablesClient"]["ClipboardSync"] }) => (
      <RenderClipboardItem
        item={item}
        deleteItem={changeClipboardItemDeletedRef.current}
      />
    ),
    [],
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
    if (deleted === deletedRef.current) return;

    deletedRef.current = deleted;

    setDefaultStates.current?.();

    Timers.clearTimeout(idTimeoutSearch.current);
    idTimeoutSearch.current = Timers.setTimeout(() => {
      fetchClipboardFromDatabaseRef.current(searchText);
    }, 1000);
  }, [searchText, deleted]);

  useEffect(() => {
    fetchClipboardFromDatabaseRef.current();

    return () => {
      Timers.clearTimeout(idTimeoutRef.current);
      Timers.clearTimeout(idTimeoutSearch.current);
    };
  }, []);

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
          onChangeText={handleSearchingRef.current}
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
        data={searchData || clipboardData}
        onScroll={handleScrollRef.current}
        renderItem={renderItems}
        scrollEnabled={!isLoading}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.scrollViewContentContainer}
        refreshControl={
          <RefreshControl
            enabled={!isLoading}
            onRefresh={handleRefreshRef.current}
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
            onPress={handleRefreshRef.current}
            disabled={isLoading}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default ClipboardScreen;
