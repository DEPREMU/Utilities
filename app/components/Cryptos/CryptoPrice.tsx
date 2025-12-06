import {
  logError,
  stringifyData,
  fetchToServer,
  getFormattedDate,
  setTimeoutPolyfill,
  setIntervalPolyfill,
  clearIntervalPolyfill,
} from "@utils";
import { View, Text } from "react-native";
import SkeletonLoading from "@components/common/SkeletonLoading";
import { SelectedCryptos } from "@types";
import { useStylesCryptoPrice } from "@styles/components/cryptos/useStylesCryptoPrice";
import React, { useState, useEffect } from "react";

type CryptoPriceProps = {
  cryptoData: SelectedCryptos[string];
  priceOfCrypto: string;
  ownedAmount: string;
  firstInvest: string;
  gainAmount: string;
  datePurchased: string;
  currentPrice: string;
};

const CryptoPrice: React.FC<CryptoPriceProps> = ({
  cryptoData,
  priceOfCrypto: _priceOfCrypto = "The price of {{cryptoName}} is:",
  ownedAmount = "You own: {{amount}} {{cryptoName}}",
  firstInvest = "You invested: {{amount}} {{cryptoName}} with the price of {{price}}",
  gainAmount = "You gained: {{gainAmount}} {{currency}}",
  datePurchased = "Date purchased: {{date}}",
  currentPrice = "Current Price",
}) => {
  const { styles } = useStylesCryptoPrice();

  const [loading, setLoading] = useState<boolean>(true);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [priceMxn, setPriceMxn] = useState<number | null>(null);
  const gainPercent =
    (
      (((priceUsd || 0) - cryptoData.firstPricePurchased) /
        cryptoData.firstPricePurchased) *
      100
    ).toFixed(2) + "%";

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetchToServer("/cryptoPrice", {
          cryptoId: cryptoData.id,
          currency: cryptoData.currency,
        });
        const data = res.data;
        const { priceUSD, error, priceUSDTMXN } = data || {
          error: res.errorText || "No data served",
        };

        if (error) {
          setPriceUsd(null);
          setPriceMxn(null);
          logError(error);
          return;
        }
        setPriceUsd(priceUSD || null);
        if (!priceUSD || !priceUSDTMXN) return;
        setPriceMxn(priceUSDTMXN * priceUSD);
      } catch (error) {
        logError(error);
      }
    };

    const handleShow = () =>
      fetchPrice().finally(() =>
        setTimeoutPolyfill(() => setLoading?.(false), 1500),
      );

    const id = setIntervalPolyfill(handleShow, 9999);
    handleShow();
    return () => clearIntervalPolyfill(id);
  }, [cryptoData]);

  return (
    <View style={styles.container}>
      <View style={styles.cryptoHeader}>
        <SkeletonLoading
          style={[styles.cryptoName, styles.padding0]}
          showChildren={!loading}
        >
          <Text style={styles.cryptoName}>{cryptoData.id}</Text>
        </SkeletonLoading>
        <SkeletonLoading
          style={[styles.cryptoCurrencyContainer, styles.padding0]}
          showChildren={!loading}
        >
          <View style={styles.cryptoCurrencyContainer}>
            <Text style={styles.cryptoCurrency}>{cryptoData.currency}</Text>
          </View>
        </SkeletonLoading>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>{currentPrice}</Text>
        <SkeletonLoading
          style={[styles.pricesContainer, styles.padding0]}
          showChildren={!loading}
        >
          <View style={styles.pricesContainer}>
            <Text style={styles.price}>
              {cryptoData.currency}: ${priceUsd?.toFixed(2)}
              {priceMxn !== null && `\nMXN: $${priceMxn?.toFixed(2)}`}
            </Text>
          </View>
        </SkeletonLoading>
      </View>

      <View style={styles.infoSection}>
        <SkeletonLoading
          style={[styles.ownedText, styles.padding0]}
          showChildren={!loading}
        >
          <Text style={styles.ownedText}>
            {ownedAmount
              .replace("{{amount}}", Number(cryptoData.amount).toString())
              .replace("{{cryptoName}}", cryptoData.id || "")}
          </Text>
        </SkeletonLoading>
        <SkeletonLoading
          style={[styles.ownedAmount, styles.padding0]}
          showChildren={!loading}
        >
          <Text style={styles.ownedAmount}>
            {cryptoData.currency}: $
            {(parseFloat(cryptoData.amount) * (priceUsd || 0)).toFixed(2)}
          </Text>
        </SkeletonLoading>
        <SkeletonLoading
          style={[styles.ownedAmount, styles.padding0]}
          showChildren={!loading}
        >
          {priceMxn !== null && !loading && (
            <Text style={styles.ownedAmount}>
              MXN: ${(parseFloat(cryptoData.amount) * priceMxn).toFixed(2)}
            </Text>
          )}
        </SkeletonLoading>
      </View>

      <View style={styles.divider} />

      <SkeletonLoading
        style={[styles.firstInvest, styles.padding0]}
        showChildren={!loading}
      >
        <Text style={styles.firstInvest}>
          {firstInvest
            .replace("{{amount}}", Number(cryptoData.amount).toString())
            .replace("{{cryptoName}}", cryptoData.id || "")
            .replace("{{price}}", cryptoData.firstPricePurchased.toString())}
        </Text>
      </SkeletonLoading>

      <View style={styles.gainContainer}>
        <SkeletonLoading
          style={[styles.gainAmount, styles.padding0]}
          showChildren={!loading}
        >
          <Text style={styles.gainAmount}>
            {gainAmount
              .replace(
                "{{gainAmount}}",
                String(
                  (
                    Number(cryptoData.amount) * (priceUsd || 0) -
                    cryptoData.firstPricePurchased * Number(cryptoData.amount)
                  ).toFixed(2),
                ),
              )
              .replace("{{currency}}", cryptoData?.currency || "")}
          </Text>
        </SkeletonLoading>
        <SkeletonLoading
          style={[styles.gainPercent, styles.padding0]}
          showChildren={!loading}
        >
          <Text
            style={[
              styles.gainPercent,
              gainPercent.startsWith("-") ? styles.colorRed : styles.colorGreen,
            ]}
          >
            {gainPercent}
          </Text>
        </SkeletonLoading>
      </View>

      {!!cryptoData.datePurchased && (
        <SkeletonLoading
          style={[styles.datePurchasedText, styles.padding0]}
          showChildren={!loading}
        >
          <Text style={styles.datePurchasedText}>
            {datePurchased.replace(
              "{{date}}",
              getFormattedDate(new Date(cryptoData.datePurchased), undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            )}
          </Text>
        </SkeletonLoading>
      )}
    </View>
  );
};

const CryptoPriceMemo = React.memo(CryptoPrice, (prevProps, nextProps) => {
  return (
    stringifyData(prevProps.cryptoData) ===
      stringifyData(nextProps.cryptoData) &&
    prevProps.currentPrice === nextProps.currentPrice &&
    prevProps.gainAmount === nextProps.gainAmount &&
    prevProps.datePurchased === nextProps.datePurchased &&
    prevProps.firstInvest === nextProps.firstInvest &&
    prevProps.priceOfCrypto === nextProps.priceOfCrypto &&
    prevProps.ownedAmount === nextProps.ownedAmount
  );
});

export { CryptoPriceMemo as CryptoPrice };
