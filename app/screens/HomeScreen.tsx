import Button from "@components/common/ButtonComponent";
import { View } from "react-native";
import { List, Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import React, { useMemo } from "react";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { useStylesHomeScreen } from "@styles/screens/useStylesHomeScreen";
import { useDeviceInformation } from "@context/DeviceInformationContext";
import { ScreensAvailable, typeLanguages } from "@types";

const buttons: Array<{
  label: keyof typeLanguages;
  screen: ScreensAvailable;
  needsInternet?: boolean;
}> = [
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
];

const HomeScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles, background } = useStylesHomeScreen();
  const { hasInternet } = useDeviceInformation();
  const { userData, logout } = useUserContext();

  const renderButtons = useMemo(() => {
    return buttons.map((button, i) => (
      <View style={styles.buttonContainer} key={i}>
        <List.Icon
          style={styles.leftIcon}
          color={background}
          icon={
            hasInternet || button.needsInternet === false
              ? "check-circle"
              : "cancel"
          }
        />
        <Button
          disabled={!hasInternet && button.needsInternet !== false}
          label={t(button.label)}
          argsFuncHandlePress={button.screen}
          touchableOpacity
          handlePress={navigateReplace}
        />
      </View>
    ));
  }, [t, hasInternet, styles.leftIcon, styles.buttonContainer, background]);

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Button label={t("logout")} handlePress={logout} />
        {!hasInternet && (
          <Text style={styles.doesNotHaveInternet}>
            {t("NoInternetConnection")}
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
