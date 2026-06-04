import { Divider } from "react-native-paper";
import { View, Text } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import SkeletonLoading from "@components/SkeletonLoading";
import { CryptoManager } from "../services";
import { useCryptoStore } from "../services/cryptoZustand";
import { useStylesCryptoPrice } from "@screens/Cryptos/styles/useStylesCryptoPrice";
import { Timers, SelectedCryptos } from "@common";
import { memoDeep, getFormattedDate } from "@utils";
import React, { useState, useEffect, useMemo, useRef } from "react";

type CryptoPriceProps = {
  cryptoData: Partial<SelectedCryptos[string]>;
};

const CryptoPrice: React.FC<CryptoPriceProps> = ({ cryptoData }) => {
  const { t } = useLanguage();
  const { styles } = useStylesCryptoPrice();
  const prices = useCryptoStore((s) => s.prices);

  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [priceMxn, setPriceMxn] = useState<number | null>(null);

  const serviceRef = useRef(CryptoManager.instance);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      if (prices.length === 0 || !cryptoData.symbol) return;

      const priceInfo = serviceRef.current.getCryptoBySymbol(
        cryptoData.symbol || "",
      );
      const mxnPriceInfo = serviceRef.current.getCryptoBySymbol(
        `${cryptoData.quoteCoin}MXN`,
      );

      if (!priceInfo) {
        setPrice(null);
        setLoading(false);
        setPriceMxn(null);

        return;
      }
      await Timers.sleep(500);

      setLoading(false);
      setPrice(priceInfo.price);
      setPriceMxn(
        mxnPriceInfo?.price ? priceInfo.price * mxnPriceInfo.price : null,
      );
    };
    fetch();
  }, [prices, cryptoData]);

  const gainPercent = useMemo(() => {
    const firstPrice = cryptoData.firstPricePurchased;
    if (!price || !firstPrice) return "N/A";

    const gain = ((price - firstPrice) / firstPrice) * 100;
    return `${gain >= 0 ? "+" : ""}${gain.toFixed(2)}%`;
  }, [price, cryptoData.firstPricePurchased]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.cryptoHeader}>
        <SkeletonLoading
          style={[styles.cryptoName, styles.padding0]}
          showChildren={!loading}
        >
          <Text style={styles.cryptoName}>{cryptoData.baseCoin}</Text>
        </SkeletonLoading>
        <SkeletonLoading
          style={[styles.cryptoCurrencyContainer, styles.padding0]}
          showChildren={!loading}
        >
          <View style={styles.cryptoCurrencyContainer}>
            <Text style={styles.cryptoCurrency}>{cryptoData.quoteCoin}</Text>
          </View>
        </SkeletonLoading>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>{t("cryptos.currentPrice")}</Text>
        <SkeletonLoading
          style={[styles.pricesContainer, styles.padding0]}
          showChildren={!loading}
        >
          <View style={styles.pricesContainer}>
            <Text style={styles.price}>
              {t("cryptos.price", {
                currency: cryptoData.quoteCoin || "",
                price: typeof price === "number" ? price.toFixed(2) : "N/A",
              })}
            </Text>
            <Text style={styles.price}>
              {typeof priceMxn === "number" &&
                t("cryptos.price", {
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
            {t("cryptos.owned", {
              amount: cryptoData.amount || "0",
              cryptoName: cryptoData.baseCoin || "",
            })}
          </Text>
        </SkeletonLoading>
        <SkeletonLoading
          style={[styles.ownedAmount, styles.padding0]}
          showChildren={!loading}
        >
          <Text style={styles.ownedAmount}>
            {/* eslint-disable-next-line react/jsx-no-literals */}
            {cryptoData.quoteCoin}: $
            {(parseFloat(cryptoData.amount || "0") * (price || 0)).toFixed(2)}
          </Text>
        </SkeletonLoading>
        <SkeletonLoading
          style={[styles.ownedAmount, styles.padding0]}
          showChildren={!loading}
        >
          {priceMxn !== null && !loading && (
            <Text style={styles.ownedAmount}>
              {t("cryptos.price", {
                currency: "MXN",
                price: (
                  parseFloat(cryptoData.amount || "0") * priceMxn
                ).toFixed(2),
              })}
            </Text>
          )}
        </SkeletonLoading>
      </View>

      <Divider style={styles.divider} />

      <SkeletonLoading
        style={[styles.firstInvest, styles.padding0]}
        showChildren={!loading}
      >
        <Text style={styles.firstInvest}>
          {t("cryptos.firstInvest", {
            price: cryptoData.firstPricePurchased?.toString() || "N/A",
            amount: Number(cryptoData.amount || "0").toString(),
            cryptoName: cryptoData.baseCoin || "",
          })}
        </Text>
      </SkeletonLoading>

      <View style={styles.gainContainer}>
        <SkeletonLoading
          style={[styles.gainAmount, styles.padding0]}
          showChildren={!loading}
        >
          <Text style={styles.gainAmount}>
            {t("cryptos.gainAmount", {
              gainAmount: String(
                (
                  Number(cryptoData.amount || "0") * (price || 0) -
                  (cryptoData.firstPricePurchased || 0) *
                    Number(cryptoData.amount || "0")
                ).toFixed(2),
              ),
              currency: cryptoData.quoteCoin || "",
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
            {t("cryptos.datePurchased", {
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
