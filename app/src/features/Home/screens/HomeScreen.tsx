import Button from "@/common/components/Button/screens";
import { List, Text } from "react-native-paper";
import { useLanguage } from "@/context/LanguageContext";
import { useBackground } from "@/context/BackgroundContext";
import { useUserContext } from "@/context/UserContext";
import { navigateReplace } from "@/app/refs/navigationRef";
import { ScrollView, View } from "react-native";
import { useStylesHomeScreen } from "@/features/Home/styles/useStylesHomeScreen";
import React, { useRef, useMemo } from "react";
import { DATA_PLATFORM, REPLACERS } from "@utils";
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
    noNeedsInternet: REPLACERS.isWeb,
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
  {
    label: "QR.title",
    screen: "QR",
    noNeedsSession: true,
    noNeedsInternet: true,
  },
  ...(REPLACERS.isNative ? buttonsNative : buttonsWeb),
  ...(REPLACERS.isDev ? buttonsDev : []),
];

const HomeScreen: React.FC = () => {
  const { t } = useLanguage();
  const { hasInternet } = useBackground();
  const { styles, background } = useStylesHomeScreen();
  const { userData, dataRef, isLoggedIn, loggingIn } = useUserContext();

  const handleLoginInWebRef = useRef(() => {
    if (!REPLACERS.isNative) return;

    navigateReplace("ScanQRCode");
  });

  const handleLoginPressRef = useRef(() => navigateReplace("Login"));

  const renderButtons = useMemo(() => {
    return buttons.map((button, i) => {
      if (
        REPLACERS.isWeb &&
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
          {REPLACERS.isNative && (
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
      {REPLACERS.isWeb && (
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
