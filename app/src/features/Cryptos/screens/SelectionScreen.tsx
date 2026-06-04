import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import { View } from "react-native";
import { create } from "zustand";
import CryptoItem from "@screens/Cryptos/components/CryptoItem";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import SkeletonLoading from "@components/SkeletonLoading";
import { useCryptoStore } from "../services/cryptoZustand";
import { useUserContext } from "@context/UserContext";
import { GetStatesZustand, ValidClearTimeout } from "@types";
import { useStylesCryptoItem } from "@screens/Cryptos/styles/useStylesCryptoItem";
import { useStylesSelectionScreen } from "@screens/Cryptos/styles/useStylesSelectionScreen";
import Animated, { LinearTransition } from "react-native-reanimated";
import { Text, Button, Searchbar, FAB } from "react-native-paper";
import { getValueState, PriceBinanceAPI, Timers } from "@common";
import React, { useMemo, useEffect, useCallback } from "react";
import { deviceInfo, memoDeep, navigation, REPLACERS } from "@utils";

type States = GetStatesZustand<{
  loading: boolean;
  iconFab: "delete" | "delete-alert" | "delete-empty";
  filterText: string;
  searchQuery: string;
  showSelected: boolean;
}>;

type Actions = {
  handleChangeText: (text: string) => void;
  handleShowSelected: () => void;
  handlePressClearCache: () => void;
};

const useSelectionStore = create<States & Actions>((set, get) => {
  const timeoutId: { c: ValidClearTimeout } = {
    c: null,
  };

  const cleanTimeout = () => {
    if (!timeoutId.c) return;

    Timers.clearTimeout(timeoutId.c);
    timeoutId.c = null;
  };

  const clearCacheData = {
    presses: 0,
    timeoutId: null as ValidClearTimeout,
  };

  const cleanTimeoutClearCache = () => {
    if (!clearCacheData.timeoutId) return;

    Timers.clearTimeout(clearCacheData.timeoutId);
    clearCacheData.timeoutId = null;
  };

  const resetCacheData = () => {
    cleanTimeoutClearCache();
    clearCacheData.presses = 0;
    get().setIconFab("delete");
  };

  return {
    handlePressClearCache: () => {
      cleanTimeoutClearCache();

      clearCacheData.presses += 1;
      const { setIconFab } = get();
      if (clearCacheData.presses === 1) {
        setIconFab("delete-alert");
      } else if (clearCacheData.presses >= 2) {
        setIconFab("delete-empty");
        useCryptoStore.getState().clearCache();
      }

      clearCacheData.timeoutId = Timers.setTimeout(() => {
        resetCacheData();
      }, 2500);
    },

    iconFab: "delete",
    setIconFab: (v) => set({ iconFab: getValueState(v, () => get().iconFab) }),

    loading: true,
    setLoading: (v) => set({ loading: getValueState(v, () => get().loading) }),

    filterText: "",
    setFilterText: (v) =>
      set({ filterText: getValueState(v, () => get().filterText) }),

    searchQuery: "",
    setSearchQuery: (v) =>
      set({ searchQuery: getValueState(v, () => get().searchQuery) }),

    showSelected: false,
    setShowSelected: (v) =>
      set({ showSelected: getValueState(v, () => get().showSelected) }),

    handleShowSelected: () =>
      set((state) => ({ showSelected: !state.showSelected })),

    handleChangeText: (text: string) => {
      const cleanedText = text.trim().toLowerCase();

      const { setSearchQuery, setFilterText } = get();
      setSearchQuery(cleanedText);

      cleanTimeout();

      timeoutId.c = Timers.setTimeout(() => {
        setFilterText(cleanedText);
        cleanTimeout();
      }, 300);
    },
  };
});

const SelectionScreen: React.FC = () => {
  const { t } = useLanguage();
  const { isLoggedIn } = useUserContext();
  const { styles, colors } = useStylesSelectionScreen();
  const { styles: stylesCryptoItem } = useStylesCryptoItem();

  const prices = useCryptoStore((s) => s.prices);
  const currency = useCryptoStore((s) => s.currency);
  const selectedCryptos = useCryptoStore((s) => s.selectedCryptos);
  const handleCheckBoxChange = useCryptoStore((s) => s.handleCheckBoxChange);

  const iconFab = useSelectionStore((s) => s.iconFab);
  const loading = useSelectionStore((s) => s.loading);
  const setLoading = useSelectionStore((s) => s.setLoading);
  const filterText = useSelectionStore((s) => s.filterText);
  const searchQuery = useSelectionStore((s) => s.searchQuery);
  const showSelected = useSelectionStore((s) => s.showSelected);
  const handleChangeText = useSelectionStore((s) => s.handleChangeText);
  const handleShowSelected = useSelectionStore((s) => s.handleShowSelected);
  const handlePressClearCache = useSelectionStore(
    (s) => s.handlePressClearCache,
  );

  const renderItem = useCallback(
    ({ item }: { item: PriceBinanceAPI[0] }) => {
      const crypto = selectedCryptos?.[item.symbol];
      const isSelected = !!crypto;

      return (
        <CryptoItem
          item={item}
          crypto={crypto}
          isSelected={isSelected}
          onCheckBoxChange={handleCheckBoxChange}
        />
      );
    },
    [selectedCryptos, handleCheckBoxChange],
  );

  const handleEmptyList = useCallback(() => {
    const lengthCryptos = (showSelected ? Object.keys(selectedCryptos) : prices)
      .length;

    return (
      <>
        {!loading && lengthCryptos === 0 && (
          <View style={stylesCryptoItem.crypto}>
            <Text style={stylesCryptoItem.subtitle}>
              {t("cryptos.noCryptosFound")}
            </Text>
          </View>
        )}
        {loading &&
          Array.from({ length: 10 }).map((_, index) => (
            <SkeletonLoading
              key={index}
              style={[stylesCryptoItem.crypto, stylesCryptoItem.padding0]}
              showChildren={false}
            >
              <View />
            </SkeletonLoading>
          ))}
      </>
    );
  }, [
    t,
    prices,
    loading,
    showSelected,
    selectedCryptos,
    stylesCryptoItem.crypto,
    stylesCryptoItem.subtitle,
    stylesCryptoItem.padding0,
  ]);

  useEffect(() => {
    if (prices) return setLoading(false);

    if (!deviceInfo.hasInternet)
      modalRef.openModal?.(
        t("common.NoInternetConnection"),
        t("common.PleaseCheckInternetConnection"),
        <Button mode="contained" onPress={() => navigation.replace("Home")}>
          <Text style={styles.h3}>{t("common.back")}</Text>
        </Button>,
      );
  }, [t, prices, styles.h3, setLoading]);

  useEffect(() => {
    return () => {
      handleChangeText("");
    };
  }, [handleChangeText]);

  const dataFlatList = useMemo((): PriceBinanceAPI => {
    if (!prices) return [];

    const isSearchQueryValid = filterText.length >= 2;
    const search = filterText;

    if (showSelected) {
      const keys = new Set(
        Object.keys(selectedCryptos).map((key) => key.toLowerCase()),
      );

      if (!isSearchQueryValid)
        return prices.filter((crypto) => keys.has(crypto.symbol.toLowerCase()));

      const filtered = new Set(
        [...keys].filter((symbol) => symbol.includes(search)),
      );
      return prices.filter((crypto) =>
        filtered.has(crypto.symbol.toLowerCase()),
      );
    }

    if (!isSearchQueryValid)
      return prices.filter((crypto) => crypto.symbol.endsWith(currency));

    return prices.filter((crypto) =>
      crypto.symbol.toLowerCase().includes(search),
    );
  }, [prices, filterText, selectedCryptos, showSelected, currency]);

  const disabled = !prices || prices.length === 0 || loading || !isLoggedIn;

  return (
    <KeyboardGestureArea style={styles.flex} interpolator="ios">
      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={50}
      >
        <View style={styles.sectionContainer}>
          <Searchbar
            value={searchQuery}
            placeholder={t("labels.search")}
            onChangeText={handleChangeText}
          />

          <View style={styles.buttonsContainer}>
            <Button
              onPress={handleShowSelected}
              disabled={disabled}
              contentStyle={styles.showSelectedButton}
            >
              <Text style={styles.h3}>
                {showSelected ? t("common.showAll") : t("common.showSelected")}
              </Text>
            </Button>
          </View>
        </View>

        <Animated.View style={styles.FAB}>
          <FAB
            animated
            icon={iconFab}
            style={styles.FAB}
            color={colors.primary}
            onPress={handlePressClearCache}
          />
        </Animated.View>

        <Animated.FlatList
          data={dataFlatList}
          style={styles.sectionContainer}
          layout={LinearTransition.duration(300).springify()}
          renderItem={renderItem}
          scrollEnabled={!loading && dataFlatList.length > 0}
          ListEmptyComponent={handleEmptyList}
          contentContainerStyle={styles.scrollViewContentContainer}
          showsVerticalScrollIndicator={REPLACERS.isWeb}
        />
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
};

const SelectionScreenMemo = memoDeep(SelectionScreen);

export default SelectionScreenMemo;
