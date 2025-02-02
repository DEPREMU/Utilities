import { useEffect, useState } from "react";
import {
  View,
  Text,
  BackHandler,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import { openURL } from "../utils/globalVariables/utils";
import { useFocusEffect } from "@react-navigation/native";
import styles from "../styles/stylesMain";
import { getAllData, getAllDataEq } from "../utils/database/dataBaseConnection";

interface MainProps {
  navigation: any;
}

interface tableProducts {
  productName: string;
  productPrice: number;
  dateBuyed: string;
  link: string;
  id: number;
}

const Main: React.FC<MainProps> = ({ navigation }) => {
  const [cash, setCash] = useState<string>("0");
  const [bankAccount, setBankAccount] = useState<string>("0");
  const [costs, setCosts] = useState<string | null>(null);
  const [totalCosts, setTotalCosts] = useState<number>(0);
  const [totalmoney, setTotalMoney] = useState<number>(0);

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
    const loadMoney = async () => {
      try {
        const { data } = await getAllData("money");
        if (!data) return;
        const lastData = data.at(-1);
        const cash = lastData.cash;
        const moneyBankAccount = lastData.bankAccount;

        setCash(cash || 0);
        setBankAccount(moneyBankAccount || 0);

        setTotalMoney(
          parseFloat(cash || 0) + parseFloat(moneyBankAccount || 0)
        );
      } catch (error) {
        console.error("Error loading money data:", error);
      }
    };

    const loadCosts = async () => {
      try {
        const { data } = await getAllDataEq("products", "dateBuyed", "NULL");

        if (data && data.length > 0) {
          let total = 0;
          data.forEach((value: tableProducts) => {
            total += value.productPrice;
          });
          setCosts(JSON.stringify(data));
          setTotalCosts(total);
        }
      } catch (error) {
        console.error("Error loading costs:", error);
      }
    };

    loadMoney();
    loadCosts();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Manage Your Money</Text>

      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.buttonBack,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          onPress={() => navigation.replace("AddCash")}
        >
          <Text style={styles.buttonText}>Add Money!</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.buttonBack,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          onPress={() => navigation.replace("DeleteMoney")}
        >
          <Text style={styles.buttonText}>Reduce Money!</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.buttonBack,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          onPress={() => navigation.replace("AddProduct")}
        >
          <Text style={styles.buttonText}>Add Product</Text>
        </Pressable>
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.texts}>Cash: ${cash}</Text>
        <Text style={styles.texts}>Bank Account: ${bankAccount}</Text>
        <Text style={styles.totalText}>Total Money: ${totalmoney}</Text>
      </View>

      <View style={styles.articles}>
        {costs != null &&
          JSON.parse(costs).map((value: tableProducts) => (
            <View key={value.id} style={styles.viewArticulos}>
              <Pressable
                style={({ pressed }) => ({
                  ...styles.go,
                  opacity: pressed ? 0.5 : 1,
                })}
                onPress={() => {
                  if (value.link) openURL(value.link);
                }}
              >
                <Text>
                  {value.id}: {value.productName}
                </Text>
              </Pressable>
              <Text style={styles.costText}>~{value.productPrice}$</Text>
            </View>
          ))}
        <Text style={styles.totalCostsText}>Total Costs: ${totalCosts}</Text>
        <Text style={styles.totalCostsText}>
          Money minus costs: ${totalmoney - totalCosts}
        </Text>
      </View>
    </ScrollView>
  );
};

export default Main;
