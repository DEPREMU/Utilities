import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import axios from "axios";
import { getDataSingle } from "../../utils/database/dataBaseConnection";
import { requestPermissions } from "../../utils/globalVariables/utils";
import Loading from "../common/Loading";
import ErrorComponent from "../common/Error";

interface CryptoPriceProps {
  cryptoId: string;
  currency?: string;
}

const CryptoPrice: React.FC<CryptoPriceProps> = ({
  cryptoId,
  currency = "USDT",
}) => {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [priceMxn, setPriceMxn] = useState<number | null>(null);
  const [cryptoName, setCryptoName] = useState<string | null>(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const responseUsd = await axios.get(
          "https://api.binance.com/api/v3/ticker/price",
          {
            params: {
              symbol: `${cryptoId.toUpperCase()}USDT`,
            },
          }
        );
        setPriceUsd(responseUsd.data.price || null);
        if (responseUsd.data.price === null) return;

        const responseMxn = await axios.get(
          "https://api.binance.com/api/v3/ticker/price",
          {
            params: {
              symbol: "USDTMXN",
            },
          }
        );
        setPriceMxn(responseMxn.data.price * responseUsd.data.price || null);
      } catch (error) {
        setError(error as string);
      } finally {
        setLoading(false);
      }
    };
    const loadName = async () => {
      const { data } = await getDataSingle(
        "cryptos",
        "cryptoName",
        "cryptoKey",
        cryptoId
      );
      setCryptoName(data.cryptoName);
    };

    fetchPrice();
    loadName();
  }, [cryptoId, currency]);

  if (loading) return <Loading boolActivityIndicator />;
  if (error) return <ErrorComponent errorText={error} />;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>El precio de {cryptoName} es:</Text>
      <Text style={styles.price}>
        USD: ${priceUsd} {"\n"}MXN: ${priceMxn}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
  },
  text: {
    fontSize: 20,
    marginBottom: 10,
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
  },
});

export { CryptoPrice };
