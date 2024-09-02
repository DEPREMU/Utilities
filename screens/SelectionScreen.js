import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { capitalize } from "../components/pythonMethods";
import { CheckBox } from "react-native-elements";
import * as Notifications from "expo-notifications";
import {
  STORAGE_KEY,
  getData,
  loadData,
  clearKey,
  loadKey,
  settingsImage,
} from "../components/globalVariables";
import { styles } from "../styles/stylesSelectionScreen";

const SelectionScreen = ({ navigation }) => {
  const [selectedCryptos, setSelectedCryptos] = useState([]);
  const [allCryptos, setAllCryptos] = useState([
    "BTC",
    "ETH",
    "TRB",
    "SOL",
    "BNB",
    "PEPE",
    "SHIB",
  ]);

  const requestPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync();
      try {
        await AsyncStorage.setItem(MINUTES_STORAGE_KEY, 2);
        const data = await getData(MINUTES_STORAGE_KEY);
        if (data !== null) {
          setStoredValue(data);
        }
      } catch {
        console.error("Error agregando minutos.");
      }
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  const handleClearCache = async () => {
    await clearKey(STORAGE_KEY);
    setSelectedCryptos([]);
  };

  useEffect(() => {
    const fetch = async () => {
      const data = await loadKey(STORAGE_KEY);
      setSelectedCryptos(data);
    };
    fetch();
  }, []);

  useEffect(() => {
    loadData(STORAGE_KEY, selectedCryptos);
  }, [selectedCryptos]);

  const handleCheckBoxChange = (cryptoId) => {
    setSelectedCryptos((prevSelected) =>
      prevSelected.includes(cryptoId)
        ? prevSelected.filter((id) => id !== cryptoId)
        : [...prevSelected, cryptoId]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.image}
          onPress={() => navigation.navigate("Configuration")}
        >
          <Image source={settingsImage} style={styles.image} />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollContainer}>
        {allCryptos.map((cryptoId) => (
          <View key={cryptoId} style={styles.checkBoxRow}>
            <View style={styles.check}>
              <CheckBox
                checked={selectedCryptos.includes(cryptoId)}
                onPress={() => handleCheckBoxChange(cryptoId)}
              />
            </View>
            <Text style={styles.text}>{capitalize(cryptoId)}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.buttonsBottom}>
        <TouchableOpacity
          onPress={handleClearCache}
          style={styles.clearCacheButton}
        >
          <Text style={styles.buttonText}>Limpiar Cache</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.showSelectedButton}
          onPress={() => navigation.navigate("Display")}
        >
          <Text style={styles.buttonText}>Mostrar seleccionados</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SelectionScreen;
