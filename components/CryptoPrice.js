import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import axios from "axios";
import * as Notifications from "expo-notifications";
import { cryptosName } from "./globalVariables";

const CryptoPrice = ({ cryptoId, currency = "USDT" }) => {
  const [priceUsd, setPriceUsd] = useState(null);
  const [priceMxn, setPriceMxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync();
      }
    };

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
        setPriceUsd(responseUsd.data.price);

        const responseMxn = await axios.get(
          "https://api.binance.com/api/v3/ticker/price",
          {
            params: {
              symbol: "USDTMXN",
            },
          }
        );
        setPriceMxn(responseMxn.data.price * responseUsd.data.price);
      } catch (error) {
        setError("Error fetching the cryptocurrency price");
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
  }, [cryptoId, currency]);

  if (loading) return <ActivityIndicator size="large" color="#0000ff" />;
  if (error) return <Text>{error}</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>El precio de {cryptosName[cryptoId]} es:</Text>
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
