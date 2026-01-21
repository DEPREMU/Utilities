import { useLanguage } from "@context/LanguageContext";
import { CryptoPrice } from "@components/Cryptos/CryptoPrice";
import SkeletonLoading from "@components/common/SkeletonLoading";
import { SelectedCryptos } from "@common";
import { useStylesCryptoPrice } from "@styles/components/cryptos/useStylesCryptoPrice";
import { View, Text, ScrollView } from "react-native";
import { useStylesDisplayScreen } from "@styles/components/cryptos/useStylesDisplayScreen";
import React, { useEffect, useMemo, useState } from "react";
import { memoDeep, setTimeoutPolyfill, clearTimeoutPolyfill } from "@utils";

interface DisplayScreenProps {
  selectedCryptos: SelectedCryptos;
}

const DisplayScreen: React.FC<DisplayScreenProps> = ({ selectedCryptos }) => {
  const { t } = useLanguage();
  const { styles } = useStylesDisplayScreen();
  const { styles: cryptoPriceStyles } = useStylesCryptoPrice();

  const [render, setRender] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const renderEmptyState = useMemo(
    () =>
      Object.keys(selectedCryptos).length === 0 &&
      !loading && (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>{t("Cryptos.icon")}</Text>
          <Text style={styles.emptyStateTitle}>
            {t("Cryptos.noCryptocurrenciesSelected")}
          </Text>
          <Text style={styles.emptyStateSubtitle}>
            {t("Cryptos.goToSelectionTab")}
          </Text>
        </View>
      ),
    [loading, selectedCryptos, styles, t],
  );

  const renderCryptos = useMemo(
    () =>
      Object.keys(selectedCryptos).length === 0 ? (
        <View style={styles.cryptoGrid}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonLoading
              key={index}
              style={[cryptoPriceStyles.container, styles.padding0]}
              showChildren={!loading}
            >
              <View />
            </SkeletonLoading>
          ))}
        </View>
      ) : (
        <View style={styles.cryptoGrid}>
          {Object.entries(selectedCryptos).map(([cryptoId, cryptoData]) => (
            <CryptoPrice
              key={cryptoId}
              cryptoData={cryptoData}
              ownedAmount={t("Cryptos.ownedAmount", {
                amount: "{{amount}}",
                cryptoName: "{{cryptoName}}",
              })}
              firstInvest={t("Cryptos.firstInvest", {
                amount: "{{amount}}",
                cryptoName: "{{cryptoName}}",
                price: "{{price}}",
              })}
              gainAmount={t("Cryptos.gainAmount", {
                currency: "{{currency}}",
                gainAmount: "{{gainAmount}}",
              })}
              datePurchased={t("Cryptos.datePurchased", { date: "{{date}}" })}
              currentPrice={t("Cryptos.currentPrice")}
            />
          ))}
        </View>
      ),
    [loading, selectedCryptos, styles, t, cryptoPriceStyles.container],
  );

  useEffect(() => {
    const timeout = setTimeoutPolyfill(() => setRender((prev) => !prev), 10000);

    return () => clearTimeoutPolyfill(timeout);
  }, [render]);

  useEffect(() => {
    const id = setTimeoutPolyfill(() => setLoading(false), 2000);

    return () => clearTimeoutPolyfill(id);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerGradient}>
        <Text style={styles.headerTitle}>{t("Cryptos.myCryptoPortfolio")}</Text>
        <Text style={styles.headerSubtitle}>
          {Object.keys(selectedCryptos).length}{" "}
          {t("Cryptos.cryptocurrenciesTracked")}
        </Text>
      </View>

      <View style={styles.refreshIndicator}>
        <Text style={styles.refreshText}>{t("common.autoRefresh")}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentScrollView}
        showsVerticalScrollIndicator={false}
      >
        {renderEmptyState}
        {renderCryptos}
      </ScrollView>
    </View>
  );
};

const DisplayScreenMemo = memoDeep(DisplayScreen);

export default DisplayScreenMemo;
