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
import { REPLACERS } from "@common";
import { useLanguage } from "@context/LanguageContext";
import { useClipboardStore } from "@screens/Clipboard/services";
import { useStylesClipboardScreen } from "@screens/Clipboard/styles";
import RenderClipboardItem from "@screens/Clipboard/components/RenderClipboardItem";
import { FAB, Searchbar, Switch, Text, Button } from "react-native-paper";
import React, { useCallback, useEffect, useRef } from "react";

const ClipboardScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesClipboardScreen();

  const deleted = useClipboardStore((s) => s.deleted);
  const noMoreData = useClipboardStore((s) => s.noMoreData);
  const refreshing = useClipboardStore((s) => s.refreshing);
  const searchText = useClipboardStore((s) => s.searchText);
  const clipboardData = useClipboardStore((s) => s.clipboardData);
  const isFarFromStart = useClipboardStore((s) => s.isFarFromStart);
  const isLoadingStore = useClipboardStore((s) => s.isLoading);
  const isLoadingSkeleton = useClipboardStore((s) => s.isLoadingSkeleton);

  const initListeners = useClipboardStore((s) => s.initListeners);
  const handleSearch = useClipboardStore((s) => s.handleSearch);
  const handleRefresh = useClipboardStore((s) => s.handleRefresh);
  const fetchClipboard = useClipboardStore((s) => s.fetchClipboard);
  const setIsFarFromStart = useClipboardStore((s) => s.setIsFarFromStart);
  const handleToggleDeleted = useClipboardStore((s) => s.handleToggleDeleted);
  const handleDeleteRestoreAll = useClipboardStore(
    (s) => s.handleDeleteRestoreAll,
  );
  const changeClipboardItemDeleted = useClipboardStore(
    (s) => s.changeClipboardItemDeleted,
  );

  const flatListRef = useRef<FlatList | null>(null);
  const isScrollingToTopRef = useRef<boolean>(false);

  const isLoading = refreshing || isLoadingStore || isLoadingSkeleton;

  const handleGoToTop = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    isScrollingToTopRef.current = true;
    setIsFarFromStart(false);
  }, [setIsFarFromStart]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;

      if (isScrollingToTopRef.current) {
        if (contentOffset.y <= 50) isScrollingToTopRef.current = false;
        return;
      }

      setIsFarFromStart(contentOffset.y > 500);

      if (isLoading || noMoreData) return;

      const distanceFromEnd =
        contentSize.height - (layoutMeasurement.height + contentOffset.y);

      if (distanceFromEnd < 750) void fetchClipboard();
    },
    [isLoading, noMoreData, fetchClipboard, setIsFarFromStart],
  );

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
    const cleanup = initListeners();
    if (useClipboardStore.getState().isLoadingSkeleton) {
      void fetchClipboard();
    }

    return () => {
      cleanup();
    };
  }, [initListeners, fetchClipboard]);

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
            onValueChange={handleToggleDeleted}
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
            onPress={handleGoToTop}
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
