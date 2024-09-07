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
  MINUTES_STORAGE_KEY,
  cryptosName as initialCryptosName,
  CRYPTOS_STORAGE_KEY,
} from "../components/globalVariables";
import { styles } from "../styles/stylesSelectionScreen";

const SelectionScreen = ({ navigation }) => {
  const [selectedCryptos, setSelectedCryptos] = useState([]);
  const [allCryptos, setAllCryptos] = useState([]);
  const [cryptosName, setCryptosName] = useState(initialCryptosName);

  const requestPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync();
      try {
        const data = await getData(MINUTES_STORAGE_KEY);
        if (data === null) {
          await AsyncStorage.setItem(MINUTES_STORAGE_KEY, "2");
        }
      } catch (error) {
        console.error(`Error adding minutes: ${error}`);
      }
    }
  };

  const handleClearCache = async () => {
    await clearKey(STORAGE_KEY);
    setSelectedCryptos([]);
  };

  const loadCryptos = async () => {
    let data = await getData(CRYPTOS_STORAGE_KEY);
    if (data) {
      data = data.split(", ");
      setAllCryptos(data);
    } else {
      const defaultCryptos = Object.keys(initialCryptosName);
      await AsyncStorage.setItem(
        CRYPTOS_STORAGE_KEY,
        defaultCryptos.join(", ")
      );
      setAllCryptos(defaultCryptos);
    }
  };

  const fetchSelectedCryptos = async () => {
    const data = await loadKey(STORAGE_KEY);
    setSelectedCryptos(data || []);
  };

  const updateCryptosName = async () => {
    try {
      let data = await getData(CRYPTOS_STORAGE_KEY);
      if (data) {
        data = data.split(", ");

        const updatedCryptosName = { ...cryptosName };
        data.forEach((value) => {
          if (!updatedCryptosName[value]) {
            updatedCryptosName[value] = value;
          }
        });

        setCryptosName(updatedCryptosName);
      }
    } catch (error) {
      console.error(`Error updating cryptosName: ${error}`);
    }
  };

  useEffect(() => {
    requestPermissions();
    fetchSelectedCryptos();
    loadCryptos();
  }, []);

  useEffect(() => {
    loadData(STORAGE_KEY, selectedCryptos);
    updateCryptosName();
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
            <Text style={styles.text}>
              {capitalize(cryptosName[cryptoId] || cryptoId)}
            </Text>
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
