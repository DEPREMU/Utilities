import {
  insertData,
  getAllDataColumn,
} from "../../utils/database/dataBaseConnection";
import {
  arrMinutes,
  ALL_NOTIFICATIONS,
  MINUTES_STORAGE_KEY,
  NOTIFICATIONS_KEY_STORAGE,
} from "../../utils/globalVariables/constants";
import {
  loadData,
  saveData,
  getPriceCrypto,
  initializateNotis,
} from "../../utils/globalVariables/utils";
import {
  View,
  Text,
  Alert,
  Pressable,
  ScrollView,
  BackHandler,
  SafeAreaView,
} from "react-native";
import { styles } from "../../styles/settings/stylesSettings";
import { CheckBox } from "react-native-elements";
import { TextInput } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";

interface SettingsProps {
  navigation: any;
}

const Settings: React.FC<SettingsProps> = ({ navigation }) => {
  const [newCrypto, setNewCrypto] = useState("");
  const [varDisplay, setVarDisplay] = useState<string>("none");
  const [allCryptos, setAllCryptos] = useState<any[]>([]);
  const [storedValue, setStoredValue] = useState<string | number | null>(null);
  const [notifications, setNotifications] = useState<string | null>(null);
  const [allNotis, setAllNotis] = useState<string>(JSON.stringify({}));

  useEffect(() => {
    const loadMinutes = async () => {
      const data = await loadData(MINUTES_STORAGE_KEY);
      const notis = await loadData(NOTIFICATIONS_KEY_STORAGE);
      setNotifications(notis);
      setStoredValue(data);
    };
    const loadCryptos = async () => {
      if (allCryptos.length > 0) return;
      const { data, error } = await getAllDataColumn("cryptos", "cryptoKey");
      if (error) return;
      const keys: any[] = [];
      data.forEach((value: { cryptoKey: string }) => {
        keys.push(value.cryptoKey);
      });
      setAllCryptos(keys);
    };

    loadCryptos();
    loadMinutes();
  }, []);

  useEffect(() => {
    const loadNotis = async () => {
      const data = await loadData(ALL_NOTIFICATIONS);
      if (!data) {
        initializateNotis();
        return;
      }
      setAllNotis(data);
    };
    loadNotis();
  }, []);

  const changeMinute = async (minutes: number) => {
    const storedValue = await loadData(MINUTES_STORAGE_KEY);

    if (Number(storedValue) == minutes) return;

    await saveData(MINUTES_STORAGE_KEY, String(minutes));

    setStoredValue(minutes);
    Alert.alert(
      `Cambiaste la frecuencia de notificaciones a ${minutes} ${
        minutes == 1 ? "minuto." : "minutos."
      }`
    );
  };

  const getNotifies = async () => {
    if (notifications == "true")
      await saveData(NOTIFICATIONS_KEY_STORAGE, JSON.stringify(false));
    else await saveData(NOTIFICATIONS_KEY_STORAGE, JSON.stringify(true));

    setNotifications((prev) => {
      if (prev == "true") return "false";
      return "true";
    });
  };

  const changeTextInput = async (value: string) =>
    setNewCrypto(value.toUpperCase());

  const checkCryptoCurrency = async () => {
    if (!newCrypto) return;

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
      setAllCryptos((prev) => [...prev, newCrypto]);
      await insertData("cryptos", { cryptoKey: newCrypto });
      setNewCrypto("");
      Alert.alert("The cryptocurrency was added successfully");
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

  const getNotification = async (key: string) => {
    const data = await loadData(ALL_NOTIFICATIONS);
    if (!data) return;
    const object = JSON.parse(data);
    object[key] = !object[key];
    await saveData(ALL_NOTIFICATIONS, JSON.stringify(object));
    setAllNotis(JSON.stringify(object));
  };

  useFocusEffect(() => {
    const onBackPress = () => {
      Alert.alert("Back", "Do you want to back to the menu selector?", [
        {
          text: "No",
          onPress: () => null,
        },
        {
          text: "Yes",
          onPress: () => navigation.replace("Start"),
        },
      ]);

      return true;
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () =>
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
  });

  return (
    <SafeAreaView style={styles.back}>
      <ScrollView style={styles.backScroll}>
        {/* Botón para cambiar frecuencia de notificaciones */}
        <Pressable
          onPress={() => showMinutes()}
          style={({ pressed }) => [
            styles.button,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>
            Cambiar frecuencia de notificaciones
          </Text>
        </Pressable>

        {/* Menú de selección de minutos */}
        <View
          style={[
            styles.menu,
            { display: varDisplay === "none" ? "none" : "flex" },
          ]}
        >
          {arrMinutes.map((minute: number, index: number) => (
            <View
              key={minute}
              style={[
                styles.settings,
                {
                  display: varDisplay === "none" ? "none" : "flex",
                  marginTop: index === 0 ? 0 : 10, // Espaciado entre opciones
                },
              ]}
            >
              <Text style={styles.minuteText}>Minutes: {minute}</Text>
              <CheckBox
                checked={storedValue == minute}
                onPress={() => {
                  changeMinute(minute);
                  showMinutes();
                }}
              />
            </View>
          ))}
        </View>

        {/* Sección para agregar nueva criptomoneda */}
        <View style={styles.viewNewCrypto}>
          <Text style={styles.sectionTitle}>Add crypto</Text>
          <TextInput
            value={newCrypto}
            placeholder="BTC"
            placeholderTextColor="#999"
            onChangeText={(value) => changeTextInput(value)}
            style={styles.textInputNewCrypto}
            maxLength={5}
          />
          <Pressable
            onPress={() => checkCryptoCurrency()}
            style={({ pressed }) => [
              styles.button,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.buttonText}>Add new crypto</Text>
          </Pressable>
        </View>

        {/* Sección para activar/desactivar notificaciones */}
        <View style={styles.getNotifies}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <CheckBox
            checked={notifications == "true"}
            onPress={() => {
              getNotifies();
            }}
          />
          {allNotis != null &&
            Object.entries(JSON.parse(allNotis)).map(([key, value]) => (
              <View style={styles.eachNotification} key={key}>
                <Text style={styles.notificationText}>{key}</Text>
                <CheckBox
                  checked={value as boolean}
                  onPress={() => {
                    getNotification(key);
                  }}
                />
              </View>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
