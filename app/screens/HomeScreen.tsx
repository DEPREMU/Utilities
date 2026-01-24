import Button from "@components/common/ButtonComponent";
import { List, Text } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import { DATA_PLATFORM } from "@utils";
import { useBackground } from "@context/BackgroundContext";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { useStylesHomeScreen } from "@styles/screens/useStylesHomeScreen";
import React, { useRef, useMemo } from "react";
import { Platform, ScrollView, View } from "react-native";
import { ScreensAvailable, typeLanguagesKeys } from "@types";

type ButtonType = {
  label: typeLanguagesKeys;
  screen: ScreensAvailable;
  noNeedsSession?: boolean;
  noNeedsInternet?: boolean;
};

const buttonsNative: ButtonType[] = [
  {
    label: "computerControl",
    screen: "ComputerControl",
    noNeedsInternet: true,
    noNeedsSession: true,
  },
  {
    label: "recorder.label",
    screen: "Recorder",
    noNeedsInternet: true,
    noNeedsSession: true,
  },
];

const buttonsWeb: ButtonType[] = [
  {
    label: "terminalCommands",
    screen: "TerminalCommands",
    noNeedsInternet: true,
    noNeedsSession: true,
  },
];

const buttonsDev: ButtonType[] = [
  {
    label: "test",
    screen: "Test",
    noNeedsInternet: true,
  },
];

const buttons: ButtonType[] = [
  { label: "common.settings", screen: "Settings", noNeedsSession: true },
  { label: "infoIP", screen: "InfoIP", noNeedsSession: true },
  { label: "cryptoInfo", screen: "Cryptos" },
  {
    label: "calculator",
    screen: "Calculator",
    noNeedsInternet: false,
    noNeedsSession: true,
  },
  {
    label: "games.title",
    screen: "Games",
    noNeedsInternet: false,
    noNeedsSession: true,
  },
  { label: "clipboard", screen: "Clipboard" },
  { label: "translator", screen: "Translator" },
  { label: "socialMedia", screen: "SocialMedia" },
  {
    label: "deviceInformation.title",
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
  {
    label: "images.labelImages",
    screen: "Images",
    noNeedsSession: true,
    noNeedsInternet: Platform.OS === "web",
  },
  {
    label: "vault.title",
    screen: "Vault",
    noNeedsSession: true,
    noNeedsInternet: true,
  },
  {
    label: "PDF.lover",
    screen: "PDF",
    noNeedsSession: true,
    noNeedsInternet: true,
  },
  ...(Platform.OS !== "web" ? buttonsNative : buttonsWeb),
  ...(process.env.NODE_ENV === "development" ? buttonsDev : []),
];

const HomeScreen: React.FC = () => {
  const { t } = useLanguage();
  const { hasInternet } = useBackground();
  const { styles, background } = useStylesHomeScreen();
  const { userData, dataRef, isLoggedIn, loggingIn } = useUserContext();

  const handleLoginInWebRef = useRef(() => {
    if (Platform.OS === "web") return;

    navigateReplace("ScanQRCode");
  });

  const handleLoginPressRef = useRef(() => navigateReplace("Login"));

  const renderButtons = useMemo(() => {
    return buttons.map((button, i) => {
      if (
        Platform.OS === "web" &&
        button.screen === "Vault" &&
        !DATA_PLATFORM.isElectron
      )
        return null;

      const loggedIn = button.noNeedsSession || isLoggedIn;
      const internet = button.noNeedsInternet || hasInternet;
      const isValidScreen = button.label === "common.settings";

      return (
        <View style={styles.buttonContainer} key={i}>
          <List.Icon
            color={background}
            style={styles.leftIcon}
            icon={
              (internet || isValidScreen) && loggedIn
                ? "check-circle"
                : "cancel"
            }
          />
          <Button
            touchableOpacity
            label={t(button.label)}
            disabled={(!internet && !isValidScreen) || !loggedIn}
            handlePress={navigateReplace}
            argsFuncHandlePress={[button.screen]}
          />
        </View>
      );
    });
  }, [
    t,
    hasInternet,
    styles.leftIcon,
    styles.buttonContainer,
    background,
    isLoggedIn,
  ]);

  return (
    <View style={styles.container}>
      {isLoggedIn && (
        <View style={styles.headerButtonsContainer}>
          <Button
            label={t("common.logout")}
            handlePress={dataRef.current.logout}
          />
          {Platform.OS !== "web" && (
            <Button
              label={t("loginWithQR")}
              handlePress={handleLoginInWebRef.current}
            />
          )}
        </View>
      )}
      {(!isLoggedIn || loggingIn) && (
        <Button
          label={t(`auth.${loggingIn ? "loggingIn" : "loginButton"}`)}
          handlePress={handleLoginPressRef.current}
        />
      )}
      {!hasInternet && (
        <Text style={styles.doesNotHaveInternet}>
          {t("common.NoInternetConnection")}
          {"\n"}
          {t("common.PleaseCheckInternetConnection")}
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
          {t("appVersion", {
            version: DATA_PLATFORM.version,
          })}
        </Text>
      )}
    </View>
  );
};

export default HomeScreen;
