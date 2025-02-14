import { SafeAreaView, BackHandler, Alert, View } from "react-native";
import React from "react";
import { Text } from "react-native-paper";
import { ONBACKPRESS } from "../../utils/globalVariables/constants";
import { useFocusEffect } from "@react-navigation/native";
import { useStylesIPScreen } from "../../styles/stylesIPs/stylesIPScreen";

type IPSCreenProps = {
  navigation: any;
};

const IPScreen: React.FC<IPSCreenProps> = ({ navigation }) => {
  const styles = useStylesIPScreen();

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Back", "Do you want to back to the menu selector?", [
          { text: "No", onPress: () => null },
          { text: "Yes", onPress: () => navigation.replace("Home") },
        ]);
        return true;
      };

      BackHandler.addEventListener(ONBACKPRESS, onBackPress);
      return () => BackHandler.removeEventListener(ONBACKPRESS, onBackPress);
    }, [navigation])
  );

  return (
    <SafeAreaView style={styles.containerSafeAreaView}>
      <Text style={styles.headerText}>IP Screen</Text>
    </SafeAreaView>
  );
};

export default IPScreen;
