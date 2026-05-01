import Animated, {
  FadeInLeft,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import { Crypto } from "@types";
import EmptyState from "../components/CryptoEmptyState";
import { FAB, Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import { CryptoPrice } from "@screens/Cryptos/components/CryptoPrice";
import { scheduleOnRN } from "react-native-worklets";
import { useCryptoStore } from "../services/cryptoZustand";
import { memoDeep, REPLACERS } from "@utils";
import { useStylesDisplayScreen } from "@screens/Cryptos/styles/useStylesDisplayScreen";
import { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";

const skeletonData = Array.from(
  { length: 6 },
  (_, i) => [i.toString(), {}] as [string, Crypto],
);

const DisplayScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesDisplayScreen();

  const loading = useCryptoStore((s) => s.loading);
  const refreshing = useCryptoStore((s) => s.refreshing);
  const selectedCryptos = useCryptoStore((s) => s.selectedCryptos);
  const handleRefreshPrices = useCryptoStore((s) => s.refreshPrices);

  const [isFarFromTop, setIsFarFromTop] = useState(false);

  const scrollRef = useRef<Animated.FlatList>(null);

  const renderEmptyState = useCallback(() => <EmptyState />, []);

  const renderCryptoItem = useCallback(
    ({ item: [cryptoId, cryptoData] }: { item: [string, Crypto] }) => {
      return <CryptoPrice key={cryptoId} cryptoData={cryptoData} />;
    },
    [],
  );

  const handleScrollToTop = useCallback(() => {
    if (!scrollRef.current) return;

    scrollRef.current.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset } = event.nativeEvent;
      scheduleOnRN(setIsFarFromTop, contentOffset.y > 200);
    },
    [],
  );

  const entries = useMemo(
    () => Object.entries(selectedCryptos),
    [selectedCryptos],
  );

  return (
    <Animated.View
      style={styles.container}
      layout={LinearTransition.duration(300).springify()}
    >
      <Animated.View
        style={styles.sectionContainer}
        layout={LinearTransition.duration(200).springify()}
      >
        <Text style={styles.title}>{t("Cryptos.myCryptoPortfolio")}</Text>
        <Text style={styles.subtitle}>
          {t("Cryptos.cryptocurrenciesTracked", {
            count: Object.keys(selectedCryptos).length,
          })}
        </Text>
      </Animated.View>

      {isFarFromTop && (
        <Animated.View
          style={styles.FAB}
          layout={LinearTransition.duration(200).springify()}
          exiting={FadeOutRight.duration(200).springify()}
          entering={FadeInLeft.duration(200).springify()}
        >
          <FAB
            animated
            icon={"arrow-up"}
            style={styles.FAB}
            color={colors.primary}
            loading={refreshing}
            onPress={handleScrollToTop}
            disabled={refreshing}
          />
        </Animated.View>
      )}

      {!isFarFromTop && (
        <Animated.View
          style={styles.FAB}
          layout={LinearTransition.duration(200).springify()}
          exiting={FadeOutRight.duration(200).springify()}
          entering={FadeInLeft.duration(200).springify()}
        >
          <FAB
            animated
            icon={refreshing ? "refresh" : "refresh-circle"}
            style={styles.FAB}
            color={colors.primary}
            label={t("common.autoRefresh")}
            loading={refreshing}
            onPress={handleRefreshPrices}
            disabled={refreshing}
          />
        </Animated.View>
      )}

      <Animated.FlatList
        ref={scrollRef}
        data={loading ? skeletonData : entries}
        style={styles.flex}
        layout={LinearTransition.duration(300).springify()}
        onScroll={handleScroll}
        renderItem={renderCryptoItem}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.contentScrollView}
        showsVerticalScrollIndicator={REPLACERS.isWeb}
      />
    </Animated.View>
  );
};

const DisplayScreenMemo = memoDeep(DisplayScreen);

export default DisplayScreenMemo;
