import {
  View,
  Text,
  Alert,
  Pressable,
  ScrollView,
  BackHandler,
} from "react-native";
import React from "react";
import styles from "../styles/stylesStart";
import { useFocusEffect } from "@react-navigation/native";

interface ButtonProps {
  text: string;
  component: string;
  navigation: any;
}

const Button: React.FC<ButtonProps> = ({ text, component, navigation }) => (
  <Pressable
    onPress={() => navigation.replace(component)}
    style={({ pressed }) => [styles.button, { opacity: pressed ? 0.6 : 1 }]}
  >
    <Text style={styles.buttonText}>{text}</Text>
  </Pressable>
);

interface StartProps {
  navigation: any;
}

const Start: React.FC<StartProps> = ({ navigation }) => {
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

  return (
    <View style={styles.container}>
      <Button text="Settings" component="Settings" navigation={navigation} />

      <Text style={styles.headerText}>Navigation</Text>
      <ScrollView
        style={styles.scrollViewButtonContainer}
        contentContainerStyle={styles.buttonContainer}
      >
        <Button
          text="Cryptos Currencies"
          component="Selection"
          navigation={navigation}
        />
        <Button text="Money Manager" component="Main" navigation={navigation} />
        <Button text="ChatsGPT" component="ChatsGPT" navigation={navigation} />
        <Button
          text="Translator"
          component="Translator"
          navigation={navigation}
        />
        <Button
          text="Homeworks"
          component="HomeWorks"
          navigation={navigation}
        />
        <Button text="WishList" component="WishList" navigation={navigation} />
        <Button text="Camiones" component="Busses" navigation={navigation} />
        <Button text="Faltas" component="Faltas" navigation={navigation} />
        <Button text="IP" component="IP" navigation={navigation} />
      </ScrollView>
    </View>
  );
};

export default Start;
