import Button from "@components/common/ButtonComponent";
import { isDev } from "@utils";
import windowModule from "@/utils/modules/WindowModule";
import { List, Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { useStylesHomeScreen } from "@styles/screens/useStylesHomeScreen";
import { useDeviceInformation } from "@context/DeviceInformationContext";
import { Platform, ScrollView, View } from "react-native";
import { ScreensAvailable, typeLanguages } from "@types";
import React, { useCallback, useEffect, useMemo, useState } from "react";

type ButtonType = {
  label: keyof typeLanguages;
  screen: ScreensAvailable;
  noNeedsSession?: boolean;
  noNeedsInternet?: boolean;
};

const buttons: ButtonType[] = [
  { label: "settings", screen: "Settings", noNeedsSession: true },
  { label: "infoIP", screen: "InfoIP", noNeedsSession: true },
  { label: "cryptoInfo", screen: "Cryptos" },
  {
    label: "calculator",
    screen: "Calculator",
    noNeedsInternet: false,
    noNeedsSession: true,
  },
  {
    label: "games",
    screen: "Games",
    noNeedsInternet: false,
    noNeedsSession: true,
  },
  { label: "clipboard", screen: "Clipboard" },
  { label: "translator", screen: "Translator" },
  { label: "socialMedia", screen: "SocialMedia" },
  {
    label: "deviceInformation",
    screen: "DeviceInformation",
    noNeedsInternet: false,
    noNeedsSession: true,
  },
  {
    label: "markdownViewer",
    screen: "MarkdownViewer",
    noNeedsInternet: false,
    noNeedsSession: true,
  },
  {
    label: "downDetector",
    screen: "DownDetector",
  },
];
if (Platform.OS !== "web") {
  buttons.push({
    label: "computerControl",
    screen: "ComputerControl",
    noNeedsInternet: true,
    noNeedsSession: true,
  });
} else {
  buttons.push({
    label: "terminalCommands",
    screen: "TerminalCommands",
    noNeedsInternet: true,
    noNeedsSession: true,
  });
}
if (isDev)
  buttons.push({
    label: "test",
    screen: "Test",
    noNeedsInternet: true,
  });

const HomeScreen: React.FC = () => {
  const { t } = useLanguage();
  const { hasInternet } = useDeviceInformation();
  const { styles, background } = useStylesHomeScreen();
  const { userData, logout, isLoggedIn, loggingIn } = useUserContext();

  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    const fetchVersion = async () => {
      if (Platform.OS !== "web") return;

      const version = await windowModule.getNativeData("version");
      setVersion(String(version));
    };
    fetchVersion();
  }, []);

  const renderButtons = useMemo(() => {
    return buttons.map((button, i) => (
      <View style={styles.buttonContainer} key={i}>
        <List.Icon
          style={styles.leftIcon}
          color={background}
          icon={
            (hasInternet ||
              button.noNeedsInternet ||
              button.label === "settings") &&
            (isLoggedIn || button.noNeedsSession)
              ? "check-circle"
              : "cancel"
          }
        />
        <Button
          disabled={
            (!hasInternet &&
              !button.noNeedsInternet &&
              button.label !== "settings") ||
            (!button.noNeedsSession && !isLoggedIn)
          }
          label={t(button.label)}
          argsFuncHandlePress={button.screen}
          touchableOpacity
          handlePress={navigateReplace}
        />
      </View>
    ));
  }, [
    t,
    hasInternet,
    styles.leftIcon,
    styles.buttonContainer,
    background,
    isLoggedIn,
  ]);

  const handleLoginPress = useCallback(() => navigateReplace("Login"), []);

  return (
    <View style={styles.container}>
      {isLoggedIn && <Button label={t("logout")} handlePress={logout} />}
      {(!isLoggedIn || loggingIn) && (
        <Button
          label={t(loggingIn ? "loggingIn" : "loginButton")}
          handlePress={handleLoginPress}
        />
      )}
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
      <ScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.scrollViewContentContainer}
      >
        {renderButtons}
      </ScrollView>
      {Platform.OS === "web" && (
        <Text style={styles.footer}>
          {t("appVersion")} - {version}
        </Text>
      )}
    </View>
  );
};

export default HomeScreen;
