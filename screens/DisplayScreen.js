import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { CryptoPrice } from "../components/CryptoPrice";
import {
  STORAGE_KEY,
  MINUTES_STORAGE_KEY,
  cryptosName,
} from "../components/globalVariables";
import axios from "axios";
import { styles } from "../styles/stylesDisplayScreen";

const DisplayScreen = ({ navigation }) => {
  const [selectedCryptos, setSelectedCryptos] = useState([]);
  const [selectedMinutes, setSelectedMinutes] = useState(null);

  useEffect(() => {
    const loadSelectedCryptos = async () => {
      try {
        const storedCryptos = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedCryptos) {
          setSelectedCryptos(JSON.parse(storedCryptos));
        }
      } catch (error) {
        console.error(
          "Error loading selected cryptocurrencies from storage",
          error
        );
      }
    };
    const loadMinutes = async () => {
      try {
        const minutes = await AsyncStorage.getItem(MINUTES_STORAGE_KEY);
        if (minutes) {
          setSelectedMinutes(minutes);
        }
      } catch (error) {
        console.error("Error loading minutes from storage", error);
      }
    };

    loadMinutes();
    loadSelectedCryptos();
  }, []);

  useEffect(() => {
    const fetchPrices = async (selectedCryptos) => {
      try {
        const prices = await Promise.all(
          selectedCryptos.map(async (key) => {
            try {
              const responseUsd = await axios.get(
                "https://api.binance.com/api/v3/ticker/price",
                {
                  params: {
                    symbol: `${key.toUpperCase()}USDT`,
                  },
                }
              );
              let money = responseUsd.data.price;
              money = parseFloat(money).toFixed(5);
              return `${getNameCrypto(key)}: ${money} USD`;
            } catch (error) {
              console.error(`Error fetching price for ${key}:`, error);
              return `${key}: Error fetching price`;
            }
          })
        );

        return prices.join("\n");
      } catch (error) {
        console.error("Error fetching prices:", error);
        return "Error fetching prices";
      }
    };

    const getNameCrypto = (value) => {
      if (Array.isArray(value)) {
        let cryptoNames = value.map((crypto) => {
          return cryptosName[crypto] || `Unknown (${crypto})`;
        });

        return cryptoNames.join(", ");
      } else if (typeof value === "string") {
        return cryptosName[value] || `Unknown (${value})`;
      }
    };

    // Función para programar notificaciones
    const scheduleNotifications = async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();

      if (selectedCryptos.length > 0) {
        const textToReturn = await fetchPrices(selectedCryptos);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Cryptocurrency Update",
            body: textToReturn,
            sound: "default",
          },
          trigger: {
            seconds: selectedMinutes > 0 ? 60 * selectedMinutes : 60,
            repeats: true,
          },
        });
      }
    };

    scheduleNotifications();
  }, [selectedCryptos, selectedMinutes]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.buttonShowSelected}
        onPress={() => navigation.navigate("Selection")}
      >
        <Text>Show Selected</Text>
      </TouchableOpacity>
      <ScrollView style={styles.scrollView}>
        {selectedCryptos.length === 0 ? (
          <Text style={styles.text}>No cryptocurrencies selected.</Text>
        ) : (
          selectedCryptos.map((cryptoId) => (
            <CryptoPrice key={cryptoId} cryptoId={cryptoId} currency="USDT" />
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default DisplayScreen;
