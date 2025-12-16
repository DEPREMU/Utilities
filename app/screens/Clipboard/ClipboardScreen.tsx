import {
  logError,
  clearRefs,
  fetchToServer,
  loadDataStorage,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import {
  View,
  FlatList,
  Platform,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import Button from "@/components/common/ButtonComponent";
import { Tables } from "@types";
import * as Clipboard from "expo-clipboard";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import RenderClipboardItem from "@components/Clipboard/RenderClipboardItem";
import { FAB, Searchbar, Switch, Text } from "react-native-paper";
import useStylesClipboardScreen from "@styles/screens/clipboard/useStylesClipboardScreen";
import React, { useCallback, useEffect, useRef, useState } from "react";

const skeletonData: Tables["ClipboardSync"][] = Array.from({ length: 5 }).map(
  () => {
    const returnData: Tables["ClipboardSync"] = {
      userId: "userId",
      deleted: false,
      content: "Loading...",
      deviceId: "deviceId",
      createdAt: new Date().toISOString(),
    };
    return returnData;
  },
);
const skeletonDataRestore: Tables["ClipboardSync"][] = skeletonData.map(
  (item) => ({ ...item, deleted: true }),
);

const getSkeletonData = (deleted: boolean) =>
  deleted ? skeletonDataRestore : skeletonData;

const limitLoadMore = Platform.OS === "web" ? 20 : 15;

const ClipboardScreen: React.FC = () => {
  const { t, language } = useLanguage();
  const { styles, colors } = useStylesClipboardScreen();
  const { userData, sessionToken } = useUserContext();

  const [deleted, setDeleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState<string>("");
  const [noMoreData, setNoMoreData] = useState<boolean>(false);
  const [isFarFromStart, setIsFarFromStart] = useState(false);
  const [clipboardData, setClipboardData] = useState<
    Tables["ClipboardSync"][] | null
  >(getSkeletonData(deleted));
  const [searchData, setSearchData] = useState<
    Tables["ClipboardSync"][] | null
  >(null);

  const pageRef = useRef<number | null>(0);
  const deletedRef = useRef<boolean | null>(deleted);
  const flatListRef = useRef<FlatList | null>(null);
  const isLoadingRef = useRef<boolean | null>(false);
  const pageRefSearch = useRef<number | null>(0);
  const hasNoMoreData = useRef<boolean | null>(false);
  const prevSearchTextRef = useRef<string | null>("");
  const hasNoMoreDataSearch = useRef<boolean | null>(false);
  const allClipboardDataRef = useRef<Tables["ClipboardSync"][] | null>(null);
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

      pageRef.current = setNull ? null : 0;
      isLoadingRef.current = setNull ? null : false;
      pageRefSearch.current = setNull ? null : 0;
      hasNoMoreData.current = setNull ? null : false;
      prevSearchTextRef.current = setNull ? null : "";
      hasNoMoreDataSearch.current = setNull ? null : false;
      allClipboardDataRef.current = null;
      isLoadingSkeletonRef.current = setNull ? null : true;
    },
  );

  const changeClipboardItemDeleted = useCallback(
    async (id: string, deleted: boolean) => {
      if (!id) return logError("No ID provided for deletion");
      if (!sessionToken) return logError("No session token available");

      const deviceId = await loadDataStorage("_deviceId");

      const res = await fetchToServer(
        "/database/update",
        {
          lang: language,
          deviceId,
          match: { id },
          table: "ClipboardSync",
          values: { deleted },
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

  const fetchClipboardFromDatabase = useCallback(
    async (searchText?: string) => {
      if (
        isLoadingRef.current ||
        hasNoMoreData.current ||
        hasNoMoreDataSearch.current
      )
        return;
      if (!sessionToken || !userData?.userId) return;

      isLoadingRef.current = true;
      setNoMoreData(false);

      const deviceId = await loadDataStorage("_deviceId");
      if (!deviceId) return;

      const page = (searchText ? pageRefSearch.current : pageRef.current) || 0;
      if (page === 0) {
        isLoadingSkeletonRef.current = true;
        if (searchText) setSearchData(getSkeletonData(!!deletedRef.current));
        else setClipboardData(getSkeletonData(!!deletedRef.current));
      }

      const res = await fetchToServer(
        "/database/fetch",
        {
          match: {
            userId: userData?.userId,
            deleted: !!deletedRef.current,
          },
          lang: language,
          limit: limitLoadMore,
          table: "ClipboardSync",
          search: searchText,
          offset: page * limitLoadMore,
          orderBy: "createdAt",
          deviceId,
          pagination: true,
          orderDirection: "DESC",
          columnsToSearch: "content",
        },
        sessionToken,
      );

      const { data, error } = res.data || {
        error: res.errorText || "Unknown error",
      };

      const handleSetVars = (data?: Tables["ClipboardSync"][]) => {
        isLoadingRef.current = false;
        setRefreshing(false);

        const prevIsLoadingSkeleton = isLoadingSkeletonRef.current;
        isLoadingSkeletonRef.current = false;

        if (!data) return;

        const refSet = searchText ? setSearchData : setClipboardData;
        refSet((prev) => {
          const oldData = prevIsLoadingSkeleton ? [] : prev || [];

          const newData = [...oldData, ...data];

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

      if (error) {
        logError("Error fetching clipboard data:", error);
        handleSetVars();
        return;
      }
      clearTimeoutPolyfill(idTimeoutRef);

      idTimeoutRef.current = setTimeoutPolyfill(
        () => handleSetVars(data || undefined),
        page > 0 ? 100 : data ? 3000 : 2000,
      );
    },
    [sessionToken, userData?.userId, language],
  );

  const handleDeleteRestoreAll = useCallback(async () => {
    if (!sessionToken) return logError("No session token available");

    const deviceId = await loadDataStorage("_deviceId");

    const newDeleted = !deletedRef.current;
    const oldDeleted = !!deletedRef.current;

    const res = await fetchToServer(
      "/database/update",
      {
        lang: language,
        match: { deleted: oldDeleted },
        table: "ClipboardSync",
        values: { deleted: newDeleted },
        deviceId,
      },
      sessionToken,
    );

    const { error } = res.data || { error: res.errorText || "Unknown error" };

    if (error) {
      logError("Error deleting clipboard item:", error);
      return;
    }

    fetchClipboardFromDatabase(searchText);
    setDeleted(newDeleted);
    setDefaultStates.current?.();
    deletedRef.current = newDeleted;
  }, [sessionToken, language, searchText, fetchClipboardFromDatabase]);

  const copyClipboardContent = useCallback(async (content: string) => {
    if (!content) return logError("No content provided for copying");

    await Clipboard.setStringAsync(content);
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;

      setIsFarFromStart(contentOffset.y > 500);

      if (isLoadingRef.current || hasNoMoreData.current) return;

      const distanceFromEnd =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      distanceFromEnd < 750 && fetchClipboardFromDatabase();
    },
    [fetchClipboardFromDatabase],
  );

  const handleRefresh = useCallback(() => {
    setDefaultStates.current?.();

    fetchClipboardFromDatabase();
  }, [fetchClipboardFromDatabase]);

  const handleGoToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setIsFarFromStart(false);
  }, []);

  const handleSearching = useCallback(
    (text: string) => {
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
            (item) =>
              !!item.content?.toLowerCase()?.includes(text.toLowerCase()),
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

      clearTimeoutPolyfill(idTimeoutSearch);

      idTimeoutSearch.current = setTimeoutPolyfill(() => {
        fetchClipboardFromDatabase(text);
      }, 2000);
    },
    [fetchClipboardFromDatabase],
  );

  const renderItems = useCallback(
    ({ item }: { item: Tables["ClipboardSync"] }) => (
      <RenderClipboardItem
        item={item}
        title={t("clipboardTitle")}
        copyLabel={t("copy")}
        deleteItem={changeClipboardItemDeleted}
        copyContent={copyClipboardContent}
        removeLabel={t(!deleted ? "remove" : "restore")}
      />
    ),
    [t, changeClipboardItemDeleted, copyClipboardContent, deleted],
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
    if (deleted === deletedRef.current) return;

    deletedRef.current = deleted;

    setDefaultStates.current?.();

    clearTimeoutPolyfill(idTimeoutSearch);
    idTimeoutSearch.current = setTimeoutPolyfill(() => {
      fetchClipboardFromDatabase(searchText);
    }, 1000);
  }, [fetchClipboardFromDatabase, searchText, deleted]);

  useEffect(() => {
    return () => {
      clearTimeoutPolyfill(idTimeoutRef, idTimeoutSearch);

      // eslint-disable-next-line react-hooks/exhaustive-deps
      setDefaultStates.current?.(true);
      clearRefs(setDefaultStates, deletedRef);
    };
  }, []);

  useEffect(() => {
    fetchClipboardFromDatabase();

    return () => clearTimeoutPolyfill(idTimeoutRef);
  }, [fetchClipboardFromDatabase]);

  const isLoading =
    refreshing || !!isLoadingRef.current || !!isLoadingSkeletonRef.current;

  return (
    <View style={styles.container}>
      <Searchbar
        value={searchText}
        style={styles.searchBar}
        editable={!isLoading}
        placeholder={t("search")}
        onChangeText={handleSearching}
      />

      <View style={styles.sectionContainer}>
        <Text style={styles.switchLabel}>{t("showDeleted")}</Text>
        <Switch
          value={deleted}
          color={colors.primary}
          disabled={isLoading}
          onValueChange={setDeleted}
        />
      </View>

      <Button
        label={deleted ? t("restoreAll") : t("deleteAll")}
        disabled={isLoading || !clipboardData || clipboardData.length === 0}
        handlePress={handleDeleteRestoreAll}
        replaceStyles={{
          button: {
            ...styles.buttonContainer,
            ...(deleted ? styles.buttonRestore : styles.buttonDelete),
          },
          textButton: styles.buttonText,
        }}
      />

      <FlatList
        nestedScrollEnabled
        ref={flatListRef}
        data={searchData || clipboardData}
        style={styles.containerFlatList}
        onScroll={handleScroll}
        renderItem={renderItems}
        keyExtractor={(item) => String(item.id || Math.random())}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
      {noMoreData && (
        <View style={styles.noMoreDataContainer}>
          <Text style={styles.noMoreDataText}>{t("noMoreData")}</Text>
        </View>
      )}
      {isFarFromStart && (
        <FAB
          size="small"
          icon="arrow-up"
          color={colors.primary}
          style={styles.scrollToTopFAB}
          onPress={handleGoToTop}
          animated
        />
      )}
      {Platform.OS === "web" && !isFarFromStart && (
        <FAB
          size="small"
          icon="refresh"
          color={colors.primary}
          style={styles.scrollToTopFAB}
          onPress={handleRefresh}
          disabled={isLoading}
          animated
        />
      )}
    </View>
  );
};

export default ClipboardScreen;
