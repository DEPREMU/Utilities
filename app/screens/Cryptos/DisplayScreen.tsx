import React, { useEffect, useState } from "react";
import { CryptoPrice } from "@components/Cryptos/CryptoPrice";
import { SelectedCryptos, stringifyData } from "@utils";
import { useStylesDisplayScreen } from "@styles/components/cryptos/useStylesDisplayScreen";
import { View, Text, ScrollView } from "react-native";
import { useLanguage } from "@context/LanguageContext";

interface DisplayScreenProps {
  selectedCryptos: SelectedCryptos;
}

const DisplayScreen: React.FC<DisplayScreenProps> = ({ selectedCryptos }) => {
  const { t } = useLanguage();
  const { styles } = useStylesDisplayScreen();
  const [render, setRender] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => setRender((prev) => !prev), 10000);

    return () => clearInterval(interval);
  }, [render]);

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
        {Object.keys(selectedCryptos).length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateIcon}>₿</Text>
            <Text style={styles.emptyStateTitle}>
              {t("noCryptocurrenciesSelected")}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {t("goToSelectionTab")}
            </Text>
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
              />
            ))}
          </View>
        )}
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
