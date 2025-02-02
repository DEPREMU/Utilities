import {
  getAllData,
  insertData,
} from "../../utils/database/dataBaseConnection";
import {
  View,
  Text,
  Alert,
  TextInput,
  Pressable,
  ScrollView,
  BackHandler,
} from "react-native";
import React, { useEffect, useState } from "react";
import ErrorComponent from "../common/Error";
import Loading from "../common/Loading";
import styles from "../../styles/finnance/stylesAddMoney";

import { useFocusEffect } from "@react-navigation/native";

interface moneyProps {
  cash: number;
  bankAccount: number;
  date: string;
}

interface DeleteMoneyProps {
  navigation: any;
}

const DeleteMoney: React.FC<DeleteMoneyProps> = ({ navigation }) => {
  const numberThingsToLoad: number = 1;
  const [newCash, setNewCash] = useState<string>("");
  const [oldCash, setOldCash] = useState<string>("");
  const [newBankAccount, setNewBankAccount] = useState<string>("");
  const [oldBankAccount, setOldBankAccount] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [loaded, setLoaded] = useState<number>(0);
  const [loadingText, setLoadingText] = useState<string>("Loading.");
  const [error, setError] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<null | string>(null);
  const [id, setId] = useState<null | number>(null);
  const [date, setDate] = useState<null | string>(null);
  const [boolLoadMoney, setBoolLoadMoney] = useState<boolean>(true);

  const checkValueBankAcc = (value: string) => {
    if (!value) setNewBankAccount("");
    if (isFinite(Number(value))) setNewBankAccount(value);
    else return;
  };
  const checkValueCash = (value: string) => {
    if (!value) setNewCash("");
    if (isFinite(Number(value))) setNewCash(value);
  };

  const addMoney = async () => {
    try {
      const { data } = await getAllData("money");
      const lastData = data.at(-1);
      const cash = lastData.cash;
      const bankAccount = lastData.bankAccount;
      setId(lastData.id);
      if (newBankAccount && newCash) {
        const newCashValue = parseFloat(cash) - parseFloat(newCash);
        const newBankAccountValue =
          parseFloat(bankAccount) - parseFloat(newBankAccount);
        const date = new Date();
        await insertData("money", {
          cash: newCashValue,
          bankAccount: newBankAccountValue,
          date: date.toString(),
        });
      } else if (newCash != "") {
        const newCashValue = parseFloat(cash) - parseFloat(newCash);
        const date = new Date();
        await insertData("money", {
          cash: newCashValue,
          bankAccount: bankAccount,
          date: date.toString(),
        });
      } else if (newBankAccount != "") {
        const newBankAccountValue =
          parseFloat(bankAccount) - parseFloat(newBankAccount);
        const date = new Date();
        await insertData("money", {
          cash: cash,
          bankAccount: newBankAccountValue,
          date: date.toString(),
        });
      }
    } catch (error) {
      setError(true);
      setErrorText("Error adding money: " + error);
    }
    setBoolLoadMoney(true);
  };

  useEffect(() => {
    if (loaded == numberThingsToLoad) setLoading(false);

    let timer: any;
    if (loading)
      timer = setTimeout(() => {
        setLoadingText(() => {
          if (loadingText == "Loading.") return "Loading..";
          else if (loadingText == "Loading..") return "Loading...";
          return "Loading.";
        });
      }, 750);
    return () => clearTimeout(timer);
  }, [loadingText]);

  useEffect(() => {
    const loadMoney = async () => {
      try {
        const { data } = await getAllData("money");
        const lastData = data.at(-1);
        const cash = lastData.cash;
        const bankAccount = lastData.bankAccount;
        const date = lastData.date
          ? new Date(lastData.date).toLocaleString()
          : null;
        setDate(date);
        setOldCash(cash);
        setOldBankAccount(bankAccount);
        setNewBankAccount("");
        setNewCash("");
      } catch (error) {
        setError(true);
        setErrorText("Error loading money: " + error);
      } finally {
        setLoaded((prev) => (prev < numberThingsToLoad ? prev + 1 : prev));
        setBoolLoadMoney(false);
      }
    };

    loadMoney();
  }, [boolLoadMoney]);

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

  if (loading)
    return <Loading boolLoadingText progress={loaded / numberThingsToLoad} />;
  if (error)
    return <ErrorComponent errorText={errorText} navigation={navigation} />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.main}>
        <View style={styles.buttonsNavigate}>
          <Pressable
            style={({ pressed }) => [
              styles.buttonGoReduce,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            onPress={() => navigation.replace("Main")}
          >
            <Text style={styles.buttonText}>Main</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.buttonGoReduce,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            onPress={() => navigation.replace("AddCash")}
          >
            <Text style={styles.buttonText}>Add money</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.buttonGoReduce,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            onPress={() => navigation.replace("AddProduct")}
          >
            <Text style={styles.buttonText}>Add Product</Text>
          </Pressable>
        </View>

        <View style={styles.addCashContainer}>
          <Text style={styles.texts}>Reduce Cash</Text>
          <TextInput
            placeholder="Reduce cash"
            value={newCash}
            onChangeText={checkValueCash}
            style={styles.textInputAddCash}
            maxLength={50}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.addMoneyAccountContainer}>
          <Text style={styles.texts}>
            Amout to reduce Money to the Bank Account
          </Text>
          <TextInput
            placeholder="Amount to reduce to bank account"
            onChangeText={checkValueBankAcc}
            value={newBankAccount}
            style={styles.textInputAddCash}
            keyboardType="numeric"
            maxLength={50}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.buttonAdd,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          onPress={addMoney}
        >
          <Text style={styles.buttonText}>Reduce</Text>
        </Pressable>

        <Text style={[styles.texts, { padding: 15 }]}>
          Now: {oldCash}. Cash: {newCash}
        </Text>
        <Text style={[styles.texts, { padding: 15 }]}>
          Now: {oldBankAccount}. Bank Account: {newBankAccount}
        </Text>
        {date != null && (
          <Text style={[styles.texts, { padding: 15 }]}>Date: {date}</Text>
        )}
      </View>
    </ScrollView>
  );
};

export default DeleteMoney;
