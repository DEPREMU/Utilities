import {
  logger,
  memoDeep,
  fetchToServer,
  getFormattedDate,
  setTimeoutPolyfill,
  setIntervalPolyfill,
  clearIntervalPolyfill,
} from "@utils";
import { View, Text } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import SkeletonLoading from "@/common/components/SkeletonLoading";
import { SelectedCryptos } from "@common";
import { useStylesCryptoPrice } from "@/features/Cryptos/styles/useStylesCryptoPrice";
import React, { useState, useEffect } from "react";

type CryptoPriceProps = {
  cryptoData: SelectedCryptos[string];
  ownedAmount: string;
  firstInvest: string;
  gainAmount: string;
  datePurchased: string;
  currentPrice: string;
};

const CryptoPrice: React.FC<CryptoPriceProps> = ({ cryptoData }) => {
  const { t } = useLanguage();
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
          logger.error(error);
          return;
        }
        setPriceUsd(priceUSD || null);
        if (!priceUSD || !priceUSDTMXN) return;
        setPriceMxn(priceUSDTMXN * priceUSD);
      } catch (error) {
        logger.error(error);
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
        <Text style={styles.priceLabel}>{t("Cryptos.currentPrice")}</Text>
        <SkeletonLoading
          style={[styles.pricesContainer, styles.padding0]}
          showChildren={!loading}
        >
          <View style={styles.pricesContainer}>
            <Text style={styles.price}>
              {t("Cryptos.price", {
                currency: cryptoData.currency,
                price: priceUsd ? priceUsd.toFixed(2) : "N/A",
              })}
              {priceMxn !== null &&
                t("Cryptos.price", {
                  currency: "MXN",
                  price: priceMxn.toFixed(2),
                })}
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
            {t("Cryptos.owned", {
              amount: cryptoData.amount,
              cryptoName: cryptoData.id || "",
            })}
          </Text>
        </SkeletonLoading>
        <SkeletonLoading
          style={[styles.ownedAmount, styles.padding0]}
          showChildren={!loading}
        >
          <Text style={styles.ownedAmount}>
            {/* eslint-disable-next-line react/jsx-no-literals */}
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
              {t("Cryptos.price", {
                currency: "MXN",
                price: (parseFloat(cryptoData.amount) * priceMxn).toFixed(2),
              })}
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
          {t("Cryptos.firstInvest", {
            cryptoName: cryptoData.id || "",
            amount: Number(cryptoData.amount).toString(),
            price: cryptoData.firstPricePurchased.toString(),
          })}
        </Text>
      </SkeletonLoading>

      <View style={styles.gainContainer}>
        <SkeletonLoading
          style={[styles.gainAmount, styles.padding0]}
          showChildren={!loading}
        >
          <Text style={styles.gainAmount}>
            {t("Cryptos.gainAmount", {
              gainAmount: String(
                (
                  Number(cryptoData.amount) * (priceUsd || 0) -
                  cryptoData.firstPricePurchased * Number(cryptoData.amount)
                ).toFixed(2),
              ),
              currency: cryptoData.currency,
            })}
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
            {t("Cryptos.datePurchased", {
              date: getFormattedDate(
                new Date(cryptoData.datePurchased),
                undefined,
                {
                  dateStyle: "medium",
                  timeStyle: "short",
                },
              ),
            })}
          </Text>
        </SkeletonLoading>
      )}
    </View>
  );
};

const CryptoPriceMemo = memoDeep(CryptoPrice);

export { CryptoPriceMemo as CryptoPrice };
