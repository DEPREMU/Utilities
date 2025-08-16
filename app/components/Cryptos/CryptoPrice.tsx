import {
  logError,
  getRouteAPI,
  fetchOptions,
  SelectedCryptos,
  stringifyData,
  log,
  getFormattedDate,
} from "@utils";
import { View, Text } from "react-native";
import { ResponseCryptoPrice } from "@types";
import { useStylesCryptoPrice } from "@styles/components/cryptos/useStylesCryptoPrice";
import React, { useState, useEffect } from "react";

type CryptoPriceProps = {
  cryptoData: SelectedCryptos[string];
  priceOfCrypto: string;
  ownedAmount: string;
  firstInvest: string;
  gainAmount: string;
  datePurchased: string;
};

const CryptoPrice: React.FC<CryptoPriceProps> = ({
  cryptoData,
  priceOfCrypto: _priceOfCrypto = "The price of {{cryptoName}} is:",
  ownedAmount = "You own: {{amount}} {{cryptoName}}",
  firstInvest = "You invested: {{amount}} {{cryptoName}} with the price of {{price}}",
  gainAmount = "You gained: {{gainAmount}} {{currency}}",
  datePurchased = "Date purchased: {{date}}",
}) => {
  const { styles } = useStylesCryptoPrice();

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
        const data = await fetch(
          await getRouteAPI("/cryptoPrice"),
          fetchOptions("POST", {
            cryptoId: cryptoData.id,
            currency: cryptoData.currency,
          }),
        ).then(async (r) => (await r.json()) as ResponseCryptoPrice);
        log(data, cryptoData);
        const { priceUSD, error, priceUSDTMXN } = data;
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

    const id = setInterval(fetchPrice, 10000);
    fetchPrice();
    return () => clearInterval(id);
  }, [cryptoData]);

  if (!priceUsd) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cryptoHeader}>
        <Text style={styles.cryptoName}>{cryptoData.id}</Text>
        <Text style={styles.cryptoSymbol}>{cryptoData.currency}</Text>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Current Price</Text>
        <Text style={styles.price}>
          {cryptoData.currency}: ${priceUsd.toFixed(2)}
          {priceMxn !== null && `\nMXN: $${priceMxn.toFixed(2)}`}
        </Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.ownedText}>
          {ownedAmount
            .replace("{{amount}}", Number(cryptoData.amount).toString())
            .replace("{{cryptoName}}", cryptoData.id || "")}
        </Text>
        <Text style={styles.ownedAmount}>
          {cryptoData.currency}: $
          {(parseFloat(cryptoData.amount) * priceUsd).toFixed(2)}
        </Text>
        {priceMxn !== null && (
          <Text style={styles.ownedAmount}>
            MXN: ${(parseFloat(cryptoData.amount) * priceMxn).toFixed(2)}
          </Text>
        )}
      </View>

      <View style={styles.divider} />

      <Text style={styles.firstInvest}>
        {firstInvest
          .replace("{{amount}}", Number(cryptoData.amount).toString())
          .replace("{{cryptoName}}", cryptoData.id || "")
          .replace("{{price}}", cryptoData.firstPricePurchased.toString())}
      </Text>

      <View style={styles.gainContainer}>
        <Text style={styles.gainAmount}>
          {gainAmount
            .replace(
              "{{gainAmount}}",
              String(
                (
                  Number(cryptoData.amount) * priceUsd -
                  cryptoData.firstPricePurchased * Number(cryptoData.amount)
                ).toFixed(2),
              ),
            )
            .replace("{{currency}}", cryptoData?.currency || "")}
        </Text>
        <Text
          style={[
            styles.gainPercent,
            gainPercent.startsWith("-") ? styles.colorRed : styles.colorGreen,
          ]}
        >
          {gainPercent}
        </Text>
      </View>

      {!!cryptoData.datePurchased && (
        <Text style={styles.datePurchasedText}>
          {datePurchased.replace(
            "{{date}}",
            getFormattedDate(new Date(cryptoData.datePurchased), undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          )}
        </Text>
      )}
    </View>
  );
};

const CryptoPriceMemo = React.memo(CryptoPrice, (prevProps, nextProps) => {
  return (
    stringifyData(prevProps.cryptoData) ===
      stringifyData(nextProps.cryptoData) &&
    prevProps.priceOfCrypto === nextProps.priceOfCrypto &&
    prevProps.ownedAmount === nextProps.ownedAmount
  );
});

export { CryptoPriceMemo as CryptoPrice };
