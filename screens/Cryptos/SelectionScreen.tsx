import {
  STORAGE_KEY,
  settingsImage,
} from "../../utils/globalVariables/constants";
import {
  getAllData,
  updateColumns,
} from "../../utils/database/dataBaseConnection";
import {
  loadData,
  saveData,
  capitalize,
  removeData,
  requestPermissions,
} from "../../utils/globalVariables/utils";
import {
  View,
  Text,
  Image,
  Alert,
  Pressable,
  TextInput,
  BackHandler,
  ScrollView,
} from "react-native";
import Loading from "../../components/common/Loading";
import { styles } from "../../styles/cryptos/stylesSelectionScreen";
import { CheckBox } from "react-native-elements";
import { useFocusEffect } from "@react-navigation/native";
import { useState, useEffect } from "react";

interface SelectionScreenProps {
  navigation: any;
}

interface tableCryptos {
  id: number;
  cryptoKey: string;
  cryptoName: string;
  ownedCrypto: number;
}

const SelectionScreen: React.FC<SelectionScreenProps> = ({ navigation }) => {
  const tableName = "cryptos";
  const thingToLoad = 1;
  const [loading, setLoading] = useState<boolean>(true);
  const [cryptos, setCryptos] = useState<string | null>(null);
  const [thingLoaded, setThingsLoaded] = useState<number>(0);
  const [selectedCryptos, setSelectedCryptos] = useState<any[]>([]);
  const [posetionCrypto, setPosetionCryptos] = useState<string | null>(null);

  const handleClearCache = async () => {
    await removeData(STORAGE_KEY);
    setSelectedCryptos([]);
  };

  const handleCheckBoxChange = (cryptoId: number) => {
    if (!selectedCryptos) return;
    setSelectedCryptos((prevSelected) =>
      prevSelected.includes(cryptoId)
        ? prevSelected.filter((id) => id !== cryptoId)
        : [...prevSelected, cryptoId]
    );
  };

  const updateOwnedCryptos = () => {
    if (!posetionCrypto) return;
    const did = Promise.all(
      (Object.entries(JSON.parse(posetionCrypto)) as [any, any][]).map(
        async ([key, value]) => {
          await updateColumns(
            tableName,
            { ownedCrypto: value },
            "keyCrypto",
            key
          );
        }
      )
    );
  };

  useEffect(() => {
    const fetchSelectedCryptos = async () =>
      setSelectedCryptos(JSON.parse((await loadData(STORAGE_KEY)) || "[]"));

    const loadCryptos = async () => {
      const { data, error } = await getAllData(tableName);
      if (error) return;
      const cryptos: { [key: string]: string } = {};
      const posetionCryptos: { [key: string]: number } = {};
      data.forEach((value: tableCryptos) => {
        cryptos[value.cryptoKey] = value.cryptoName;
        posetionCryptos[value.cryptoKey] = value.ownedCrypto;
      });
      setCryptos(JSON.stringify(cryptos));
      setPosetionCryptos(JSON.stringify(posetionCryptos));
      setThingsLoaded((prev) => prev + 1);
    };

    loadCryptos();
    requestPermissions();
    fetchSelectedCryptos();
  }, []);

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

  useEffect(() => {
    saveData(STORAGE_KEY, JSON.stringify(selectedCryptos));
  }, [selectedCryptos]);

  useEffect(() => {
    if (thingLoaded >= thingToLoad) setLoading(false);
  }, [thingLoaded]);

  if (loading)
    return (
      <Loading boolActivityIndicator progress={thingLoaded / thingToLoad} />
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.image,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          onPress={() => navigation.replace("Settings")}
        >
          <Image source={settingsImage} style={styles.image} />
        </Pressable>
      </View>
      <ScrollView style={styles.scrollContainer}>
        {cryptos !== null &&
          posetionCrypto != null &&
          Object.entries(JSON.parse(cryptos)).map(([key, name]) => (
            <View key={key} style={styles.checkBoxRow}>
              <Text style={styles.text}>
                {name ? capitalize(String(name)) : key}
              </Text>
              <View style={styles.inputContainer}>
                <CheckBox
                  checked={selectedCryptos.includes(key)}
                  onPress={() => handleCheckBoxChange(Number(key))}
                />
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={JSON.parse(posetionCrypto)[key].toString()}
                  onChangeText={(text) => {
                    const newCrypto = JSON.parse(posetionCrypto);
                    newCrypto[key] = text;
                    setPosetionCryptos(JSON.stringify(newCrypto));
                  }}
                />
              </View>
            </View>
          ))}
      </ScrollView>

      <View style={styles.buttonsBottom}>
        <Pressable
          onPress={() => updateOwnedCryptos()}
          style={({ pressed }) => [
            styles.clearCacheButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>Actualizar las poseciones</Text>
        </Pressable>
        <Pressable
          onPress={handleClearCache}
          style={({ pressed }) => [
            styles.clearCacheButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>Limpiar Cache</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.showSelectedButton,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          onPress={() => navigation.replace("Display")}
        >
          <Text style={styles.buttonText}>Mostrar seleccionados</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default SelectionScreen;
