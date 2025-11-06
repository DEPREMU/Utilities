import { useLanguage } from "@context/LanguageContext";
import { CryptoPrice } from "@components/Cryptos/CryptoPrice";
import SkeletonLoading from "@components/common/SkeletonLoading";
import { stringifyData } from "@utils";
import { SelectedCryptos } from "@types";
import { useStylesCryptoPrice } from "@styles/components/cryptos/useStylesCryptoPrice";
import { View, Text, ScrollView } from "react-native";
import { useStylesDisplayScreen } from "@styles/components/cryptos/useStylesDisplayScreen";
import React, { useEffect, useMemo, useState } from "react";

interface DisplayScreenProps {
  selectedCryptos: SelectedCryptos;
}

const DisplayScreen: React.FC<DisplayScreenProps> = ({ selectedCryptos }) => {
  const { t } = useLanguage();
  const useStyles = useStylesDisplayScreen();
  const { styles: cryptoPriceStyles } = useStylesCryptoPrice();

  const styles = useMemo(() => useStyles.styles, [useStyles.styles]);

  const [loading, setLoading] = useState<boolean>(true);
  const [render, setRender] = useState<boolean>(false);

  const renderEmptyState = useMemo(
    () =>
      Object.keys(selectedCryptos).length === 0 &&
      !loading && (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateIcon}>₿</Text>
          <Text style={styles.emptyStateTitle}>
            {t("noCryptocurrenciesSelected")}
          </Text>
          <Text style={styles.emptyStateSubtitle}>{t("goToSelectionTab")}</Text>
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
              priceOfCrypto={t("priceOfCrypto")}
              ownedAmount={t("ownedAmount")}
              firstInvest={t("firstInvest")}
              gainAmount={t("gainAmount")}
              datePurchased={t("datePurchased")}
              currentPrice={t("currentPrice")}
            />
          ))}
        </View>
      ),
    [loading, selectedCryptos, styles, t, cryptoPriceStyles.container],
  );

  useEffect(() => {
    const interval = setInterval(() => setRender((prev) => !prev), 10000);

    return () => clearInterval(interval);
  }, [render]);

  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 2000);

    return () => clearTimeout(id);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerGradient}>
        <Text style={styles.headerTitle}>{t("myCryptoPortfolio")}</Text>
        <Text style={styles.headerSubtitle}>
          {Object.keys(selectedCryptos).length} {t("cryptocurrenciesTracked")}
        </Text>
      </View>

      <View style={styles.refreshIndicator}>
        <Text style={styles.refreshText}>{t("autoRefresh")}</Text>
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

const DisplayScreenMemo = React.memo(DisplayScreen, (prevProps, nextProps) => {
  return (
    stringifyData(prevProps.selectedCryptos) ===
    stringifyData(nextProps.selectedCryptos)
  );
});

export default DisplayScreenMemo;
