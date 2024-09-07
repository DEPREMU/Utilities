import { ScrollView, View, Text, TouchableOpacity, Alert } from "react-native";
import { CheckBox } from "react-native-elements";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CRYPTOS_STORAGE_KEY,
  MINUTES_STORAGE_KEY,
  arrMinutes,
  clearKey,
  getPriceCrypto,
  saveDataJSON as saveData,
} from "../components/globalVariables";
import { style } from "../styles/stylesConfiguration";
import { TextInput } from "react-native-gesture-handler";

export default Configuration = ({ navigation }) => {
  const [storedValue, setStoredValue] = useState(null);
  const [varDisplay, setVarDisplay] = useState("none");
  const [allCryptos, setAllCryptos] = useState([]);
  const [newCrypto, setNewCrypto] = useState("");

  const loadMinutes = async () => {
    const data = await getData(MINUTES_STORAGE_KEY);
    if (data !== null) {
      setStoredValue(data);
    }
  };
  const loadCryptos = async () => {
    if (allCryptos.length > 0) return;
    const data = await getData(CRYPTOS_STORAGE_KEY);
    if (data !== null) setAllCryptos(data.split(", "));
  };

  useEffect(() => {
    loadCryptos();
    loadMinutes();
  }, []);

  const getData = async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        return value;
      }
      return null;
    } catch (error) {
      console.error("Error retrieving data", error);
      return null;
    }
  };

  const changeMinute = async (minutes) => {
    const storedValue = await getData(MINUTES_STORAGE_KEY);

    if (storedValue == minutes) return;

    await AsyncStorage.removeItem(MINUTES_STORAGE_KEY);
    await saveData(MINUTES_STORAGE_KEY, minutes);

    setStoredValue(minutes);
    Alert.alert(
      `Cambiaste la frecuencia de notificaciones a ${minutes} ${
        minutes == 1 ? "minuto." : "minutos."
      }`
    );
  };

  const changeTextInput = (value) => {
    setNewCrypto(value);
  };

  const checkCryptoCurrency = async (newCrypto) => {
    newCrypto = newCrypto.toUpperCase();
    if (allCryptos.includes(newCrypto)) {
      Alert.alert("The cryptocurrency is already added.");
      setNewCrypto("");
      return;
    }
    const condition = await getPriceCrypto(newCrypto);
    if (!condition) {
      Alert.alert("The cryptocurrency does not exist or it was an error.");
      setNewCrypto("");
      return;
    } else {
      let newCryptos =
        allCryptos.length > 0 ? allCryptos : await getData(CRYPTOS_STORAGE_KEY);
      if (typeof newCryptos == "string") {
        newCryptos = newCryptos.split(", ");
      }
      newCryptos.push(newCrypto);
      await clearKey(CRYPTOS_STORAGE_KEY);
      await AsyncStorage.setItem(CRYPTOS_STORAGE_KEY, newCryptos.join(", "));
      setNewCrypto("");
      setAllCryptos([]);
      Alert.alert("The cryptocurrency was added successfully");
      await loadCryptos();
    }
  };

  const showMinutes = () => {
    if (varDisplay == "none") {
      setVarDisplay("absolute");
      return;
    }
    setVarDisplay("none");
    return;
  };

  return (
    <View style={style.back}>
      <TouchableOpacity
        onPress={() => navigation.navigate("Selection")}
        style={style.backButton}
      >
        <Text style={{ fontSize: 20 }}>Back</Text>
      </TouchableOpacity>
      <ScrollView style={style.backScroll}>
        <TouchableOpacity onPress={() => showMinutes()} style={style.button}>
          <Text>Cambiar frecuencia de notificaciones</Text>
        </TouchableOpacity>
        <View style={[style.menu, { display: varDisplay }]}>
          {arrMinutes.map((minute, index) => (
            <View
              key={minute}
              style={[
                style.settings,
                {
                  display: varDisplay,
                  position: varDisplay,
                  marginTop: index * 50,
                },
              ]}
            >
              <Text>Minutes: {minute}</Text>
              <CheckBox
                checked={storedValue == minute}
                onPress={() => (changeMinute(minute), showMinutes())}
                onClick="changeMinute(minute) showMinutes()"
              />
            </View>
          ))}
        </View>
        <View style={style.viewNewCrypto}>
          <Text style={style.text}>Add crypto</Text>
          <TextInput
            value={newCrypto}
            placeholder='Add a new crypto as its original name p.g. "BTC"'
            onChangeText={(value) => changeTextInput(value)}
            style={style.textInputNewCryto}
          />
          <TouchableOpacity
            onPress={async () => {
              if (newCrypto === "") return;
              await checkCryptoCurrency(newCrypto);
            }}
            style={style.button}
          >
            <Text>Add new crypto</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
