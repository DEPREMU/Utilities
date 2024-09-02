import { ScrollView, View, Text, TouchableOpacity, Alert } from "react-native";
import { CheckBox } from "react-native-elements";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MINUTES_STORAGE_KEY, arrMinutes } from "../components/globalVariables";
import { style } from "../styles/stylesConfiguration";

export default Configuration = ({ navigation }) => {
  const [storedValue, setStoredValue] = useState(null);
  const [varDisplay, setVarDisplay] = useState("none");

  const saveData = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error saving data", error);
    }
  };

  useEffect(() => {
    const loadMinutes = async () => {
      const data = await getData(MINUTES_STORAGE_KEY);
      if (data !== null) {
        setStoredValue(data);
      }
    };
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
      `Cambiaste la frecuencia de notificaciones a ${minutes} minutos.`
    );
  };

  const showMinutes = () => {
    if (varDisplay == "none") {
      setVarDisplay("absolute");
      return;
    }
    if (varDisplay == "absolute") setVarDisplay("none");
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
      </ScrollView>
    </View>
  );
};
