import {
  Text,
  Alert,
  Pressable,
  ScrollView,
  BackHandler,
  SafeAreaView,
} from "react-native";
import React from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ONBACKPRESS } from "../utils/globalVariables/constants";
import useStylesHome from "../styles/stylesHome";
import ButtonLocal from "../components/Home/ButtonComponent";

type HomeProps = {
  navigation: any;
};

const Home: React.FC<HomeProps> = ({ navigation }) => {
  const styles = useStylesHome();

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Back", "Do you want to back to the menu selector?", [
          { text: "No", onPress: () => null },
          { text: "Yes", onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };

      BackHandler.addEventListener(ONBACKPRESS, onBackPress);
      return () => BackHandler.removeEventListener(ONBACKPRESS, onBackPress);
    }, [navigation])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ButtonLocal
        text="Settings"
        component="Settings"
        navigation={navigation}
        buttonStyle={styles.button}
        buttonText={styles.buttonText}
      />

      <Text style={styles.headerText}>Navigation</Text>
      <ScrollView
        style={styles.scrollViewButtonContainer}
        contentContainerStyle={styles.buttonContainer}
        showsVerticalScrollIndicator={false}
      >
        <ButtonLocal
          text="IP data"
          component="IPScreen"
          navigation={navigation}
          buttonStyle={styles.button}
          buttonText={styles.buttonText}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Home;
