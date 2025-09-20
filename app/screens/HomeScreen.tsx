import Button from "@components/common/ButtonComponent";
import { View } from "react-native";
import { List, Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import { useNavigation } from "@react-navigation/native";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { RootStackParamList } from "@navigation/AppNavigator";
import { useStylesHomeScreen } from "@styles/screens/useStylesHomeScreen";
import { useDeviceInformation } from "@context/DeviceInformationContext";
import React, { useEffect, useMemo } from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreensAvailable, typeLanguages } from "@types";

type ButtonType = {
  label: keyof typeLanguages;
  screen: ScreensAvailable;
  needsInternet?: boolean;
};

const dev: ButtonType | undefined =
  __DEV__ || process.env.NODE_ENV === "development"
    ? { label: "test", screen: "Test", needsInternet: false }
    : undefined;

const buttons: ButtonType[] = [
  { label: "settings", screen: "Settings" },
  { label: "infoIP", screen: "InfoIP" },
  { label: "cryptoInfo", screen: "Cryptos" },
  { label: "calculator", screen: "Calculator", needsInternet: false },
  { label: "games", screen: "Games", needsInternet: false },
  { label: "clipboard", screen: "Clipboard" },
  { label: "translator", screen: "Translator" },
  { label: "socialMedia", screen: "SocialMedia" },
  {
    label: "deviceInformation",
    screen: "DeviceInformation",
    needsInternet: false,
  },
  dev,
].filter((btn): btn is ButtonType => btn !== undefined);

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

const HomeScreen: React.FC = () => {
  const { t } = useLanguage();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { styles, background } = useStylesHomeScreen();
  const { hasInternet } = useDeviceInformation();
  const { userData, logout, isLoggedIn } = useUserContext();

  const renderButtons = useMemo(() => {
    return buttons.map((button, i) => (
      <View style={styles.buttonContainer} key={i}>
        <List.Icon
          style={styles.leftIcon}
          color={background}
          icon={
            hasInternet ||
            button.needsInternet === false ||
            button.label === "settings"
              ? "check-circle"
              : "cancel"
          }
        />
        <Button
          disabled={
            !hasInternet &&
            button.needsInternet !== false &&
            button.label !== "settings"
          }
          label={t(button.label)}
          argsFuncHandlePress={button.screen}
          touchableOpacity
          handlePress={navigateReplace}
        />
      </View>
    ));
  }, [t, hasInternet, styles.leftIcon, styles.buttonContainer, background]);

  useEffect(() => {
    if (isLoggedIn) return;
    navigation.replace("Login");
  }, [isLoggedIn, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Button label={t("logout")} handlePress={logout} />
        {!hasInternet && (
          <Text style={styles.doesNotHaveInternet}>
            {t("NoInternetConnection")}
            {"\n"}
            {t("PleaseCheckInternetConnection")}
          </Text>
        )}
        <Text style={styles.title}>
          {t("welcomeUser", { user: userData?.name || t("user") })}
        </Text>
        {renderButtons}
      </View>
    </View>
  );
};

export default HomeScreen;
