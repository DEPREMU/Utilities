import React from "react";
import Button from "@components/common/ButtonComponent";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import { useNavigation } from "@react-navigation/native";
import { useUserContext } from "@context/UserContext";
import { RootStackParamList } from "navigation/AppNavigator";
import { useStylesHomeScreen } from "@/styles/screens/useStylesHomeScreen";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreensAvailable, typeLanguages } from "@types";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

const buttons: Array<{ label: keyof typeLanguages; screen: ScreensAvailable }> =
  [
    { label: "settings", screen: "Settings" },
    { label: "infoIP", screen: "InfoIP" },
    { label: "cryptoInfo", screen: "Cryptos" },
    { label: "calculator", screen: "Calculator" },
  ];

const HomeScreen: React.FC = () => {
  const { t } = useLanguage();
  const { userData, logout } = useUserContext();
  const { styles } = useStylesHomeScreen();
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Button label={t("logout")} handlePress={logout} />
        <Text style={styles.title}>
          {t("welcomeUser", { user: userData?.name || t("user") })}
        </Text>
        {buttons.map((button) => (
          <Button
            key={button.label}
            label={t(button.label)}
            handlePress={() => navigation.replace(button.screen)}
          />
        ))}
      </View>
    </View>
  );
};

export default HomeScreen;
