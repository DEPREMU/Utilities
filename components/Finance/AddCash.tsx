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
import Error from "../common/Error";
import styles from "../../styles/finnance/stylesAddMoney";
import Loading from "../common/Loading";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";

interface AddCashProps {
  navigation: any;
}

const AddCash: React.FC<AddCashProps> = ({ navigation }) => {
  const numberThingsToLoad: number = 1;
  const [newCash, setNewCash] = useState<string>("");
  const [oldCash, setOldCash] = useState<string>("");
  const [newBankAccount, setNewBankAccount] = useState<string>("");
  const [oldBankAccount, setOldBankAccount] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [loaded, setLoaded] = useState<number>(0);
  const [error, setError] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [id, setId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [boolLoadMoney, setBoolLoadMoney] = useState<boolean>(true);

  const checkValueBankAcc = (value: string) => {
    if (!value) setNewBankAccount("0");
    if (isFinite(Number(value))) setNewBankAccount(value);
    else return;
  };
  const checkValueCash = (value: string) => {
    if (value == "") setNewCash("0");
    if (isFinite(Number(value))) setNewCash(value);
  };

  const addMoney = async () => {
    try {
      const { data } = await getAllData("money");
      const lastData = data.at(-1);
      const cash = lastData.cash;
      const bankAccount = lastData.bankAccount;
      setId(lastData.id);
      if (newBankAccount != "" && newCash != "") {
        const newCashValue = parseFloat(cash) + parseFloat(newCash);
        const newBankAccountValue =
          parseFloat(bankAccount) + parseFloat(newBankAccount);
        const date = new Date();
        await insertData("money", {
          cash: newCashValue,
          bankAccount: newBankAccountValue,
          date: date.toString(),
        });
      } else if (newCash != "") {
        const newCashValue = parseFloat(cash) + parseFloat(newCash);
        const date = new Date();
        await insertData("money", {
          cash: newCashValue,
          bankAccount: bankAccount,
          date: date.toString(),
        });
      } else if (newBankAccount != "") {
        const newBankAccountValue =
          parseFloat(bankAccount) + parseFloat(newBankAccount);
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

  useFocusEffect(() => {
    const onBackPress = () => {
      Alert.alert("Exit the app", "Do you want to exit the app?", [
        {
          text: "No",
          onPress: () => null,
        },
        {
          text: "Yes",
          onPress: () => BackHandler.exitApp(),
        },
      ]);

      return true;
    };

    BackHandler.addEventListener("hardwareBackPress", onBackPress);

    return () =>
      BackHandler.removeEventListener("hardwareBackPress", onBackPress);
  });

  useEffect(() => {
    if (loaded >= numberThingsToLoad) setLoading(false);
  }, [loaded]);

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
        setErrorText(`Error loading money: ${error}`);
      } finally {
        setLoaded((prev) => (prev < numberThingsToLoad ? prev + 1 : prev));
        setBoolLoadMoney(false);
      }
    };

    loadMoney();
  }, [boolLoadMoney]);

  if (loading)
    return <Loading boolLoadingText progress={loaded / numberThingsToLoad} />;
  if (error)
    return <Error errorText={errorText || ""} navigation={navigation} />;

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
            onPress={() => navigation.replace("DeleteMoney")}
          >
            <Text style={styles.buttonText}>Reduce</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.buttonGoReduce,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            onPress={() => navigation.replace("AddProduct")}
          >
            <Text style={styles.buttonText}>Add product</Text>
          </Pressable>
        </View>

        <View style={styles.addCashContainer}>
          <Text style={styles.texts}>Add Cash</Text>
          <TextInput
            placeholder="Add cash"
            value={newCash}
            onChangeText={checkValueCash}
            style={styles.textInputAddCash}
            maxLength={50}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.addMoneyAccountContainer}>
          <Text style={styles.texts}>Add Money to the Bank Account</Text>
          <TextInput
            placeholder="Amount added to bank account"
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
          <Text style={styles.buttonText}>Add</Text>
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

export default AddCash;
