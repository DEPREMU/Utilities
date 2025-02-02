import {
  loadData,
  registerBackgroundFetchCryptos,
} from "../../utils/globalVariables/utils";
import {
  View,
  Text,
  Alert,
  Pressable,
  ScrollView,
  BackHandler,
} from "react-native";
import { styles } from "../../styles/cryptos/stylesDisplayScreen";
import { CryptoPrice } from "../../components/Cryptos/CryptoPrice";
import { STORAGE_KEY } from "../../utils/globalVariables/constants";
import { useFocusEffect } from "@react-navigation/native";
import { useState, useEffect } from "react";

interface DisplayScreenProps {
  navigation: any;
}

const DisplayScreen: React.FC<DisplayScreenProps> = ({ navigation }) => {
  const [selectedCryptos, setSelectedCryptos] = useState<string>(
    JSON.stringify([])
  );

  useEffect(() => {
    const loadSelectedCryptos = async () => {
      try {
        const storedCryptos = JSON.parse((await loadData(STORAGE_KEY)) || "[]");
        console.log(storedCryptos);
        if (storedCryptos) setSelectedCryptos(JSON.stringify(storedCryptos));
      } catch (error) {
        console.error(
          "Error loading selected cryptocurrencies from storage",
          error
        );
      }
    };
    registerBackgroundFetchCryptos();
    loadSelectedCryptos();
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

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.buttonShowSelected,
          { opacity: pressed ? 0.5 : 1 },
        ]}
        onPress={() => navigation.navigate("Selection")}
      >
        <Text>Show Selected</Text>
      </Pressable>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentScrollView}
      >
        {JSON.parse(selectedCryptos).length == 0 ? (
          <Text style={styles.text}>No cryptocurrencies selected.</Text>
        ) : (
          JSON.parse(selectedCryptos).map((crypto: string) => (
            <CryptoPrice key={crypto} cryptoId={crypto} currency="USD" />
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default DisplayScreen;
