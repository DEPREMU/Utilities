import Animated, {
  FadeInRight,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import {
  memoDeep,
  REPLACERS,
  deviceInfo,
  navigation,
  DATA_PLATFORM,
  sessionManager,
  EventsDeviceInfo,
  hasInternetConnection,
} from "@utils";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { useStylesHomeScreen } from "@screens/Home/styles/useStylesHomeScreen";
import RenderScreen, { ButtonType } from "../components/RenderScreen";
import { AppTranslationsKeys, Function } from "@types";
import { Text, Button, Tooltip, Searchbar, Icon } from "react-native-paper";
import React, { useState, useEffect, useCallback, useMemo } from "react";

const buttonsNative: ButtonType[] = [
  {
    label: "computerControl.title",
    screen: "ComputerControl",
    keyWords: "computerControl.keyWords",
    description: "computerControl.description",
    noNeedsSession: true,
    noNeedsInternet: true,
  },
  {
    label: "recorder.label",
    screen: "Recorder",
    keyWords: "recorder.keyWords",
    description: "recorder.description",
    noNeedsSession: true,
    noNeedsInternet: true,
  },
  {
    label: "notes.title",
    screen: "Notes",
    keyWords: "notes.keyWords",
    description: "notes.description",
    noNeedsSession: true,
    noNeedsInternet: true,
  },
];

const buttonsWeb: ButtonType[] = [
  {
    label: "terminalCommands.title",
    screen: "TerminalCommands",
    keyWords: "terminalCommands.keyWords",
    description: "terminalCommands.description",
    noNeedsSession: true,
    noNeedsInternet: true,
  },
];

const buttonsDev: ButtonType[] = [
  {
    label: "test.title",
    screen: "Test",
    keyWords: "test.title",
    description: "test.title",
    noNeedsInternet: true,
  },
];

const buttons: ButtonType[] = [
  {
    label: "common.settings",
    screen: "Settings",
    keyWords: "settings.keyWords",
    description: "settings.description",
    noNeedsSession: true,
  },
  {
    label: "network.networkInfo.title",
    screen: "Network",
    keyWords: "network.keyWords",
    description: "network.description",
    noNeedsSession: true,
  },
  {
    label: "cryptos.title",
    screen: "Cryptos",
    keyWords: "cryptos.keyWords",
    description: "cryptos.description",
  },
  {
    label: "calculator.title",
    screen: "Calculator",
    keyWords: "calculator.keyWords",
    description: "calculator.description",
    noNeedsSession: true,
  },
  {
    label: "games.title",
    screen: "Games",
    keyWords: "games.keyWords",
    description: "games.description",
    noNeedsSession: true,
  },
  {
    label: "labels.clipboard",
    screen: "Clipboard",
    keyWords: "clipboard.keyWords",
    description: "clipboard.description",
  },
  {
    label: "translator.title",
    screen: "Translator",
    keyWords: "translator.keyWords",
    description: "translator.description",
  },
  {
    label: "socialMedia.title",
    screen: "SocialMedia",
    keyWords: "socialMedia.keyWords",
    description: "socialMedia.description",
  },
  {
    label: "deviceInformation.title",
    screen: "DeviceInformation",
    keyWords: "deviceInformation.keyWords",
    description: "deviceInformation.description",
    noNeedsSession: true,
  },
  {
    label: "markdown.title",
    screen: "MarkdownViewer",
    keyWords: "markdown.keyWords",
    description: "markdown.description",
    noNeedsSession: true,
  },
  {
    label: "downDetector.title",
    screen: "DownDetector",
    keyWords: "downDetector.keyWords",
    description: "downDetector.description",
  },
  {
    label: "images.labelImages",
    screen: "Images",
    keyWords: "images.keyWords",
    description: "images.description",
    noNeedsSession: true,
    noNeedsInternet: REPLACERS.isWeb,
  },
  {
    label: "vault.title",
    screen: "Vault",
    keyWords: "vault.keyWords",
    description: "vault.description",
    noNeedsSession: true,
    noNeedsInternet: true,
  },
  {
    label: "pdf.lover",
    screen: "PDF",
    keyWords: "pdf.keyWords",
    description: "pdf.description",
    noNeedsSession: true,
    noNeedsInternet: true,
  },
  {
    label: "qr.title",
    screen: "QR",
    keyWords: "qr.keyWords",
    description: "qr.description",
    noNeedsSession: true,
    noNeedsInternet: true,
  },

  ...(REPLACERS.isNative ? buttonsNative : buttonsWeb),
  ...(REPLACERS.isDev ? buttonsDev : []),
];

const HomeScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesHomeScreen();
  const { isLoggedIn, loggingIn } = useUserContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [hasInternet, setHasInternet] = useState(deviceInfo.hasInternet);

  const handleLoginPress = useCallback(() => navigation.replace("Login"), []);

  const renderItem = useCallback(
    ({ item: button }: { item: ButtonType }) => {
      if (
        REPLACERS.isWeb &&
        button.screen === "Vault" &&
        !DATA_PLATFORM.isElectron
      )
        return null;

      return <RenderScreen button={button} hasInternet={hasInternet} />;
    },
    [hasInternet],
  );

  useEffect(() => {
    const hasInternetListener = deviceInfo.addEventListener(
      EventsDeviceInfo.hasInternetChange,
      (newState) => setHasInternet(newState),
    );
    hasInternetConnection().then(setHasInternet);

    return () => {
      hasInternetListener.remove();
    };
  }, []);

  const searchButtons: ButtonType[] | null = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    if (search === "") return null;

    const getTranslation = (key: AppTranslationsKeys) =>
      (t as Function<[AppTranslationsKeys], string>)(key).toLowerCase();

    const filtered = buttons
      .map((b) => ({
        ...b,
        labelT: getTranslation(b.label),
        keyWordsT: getTranslation(b.keyWords),
      }))
      .filter((button) => {
        const includes =
          button.keyWordsT.includes(search) || button.labelT.includes(search);

        return includes;
      })
      .sort((a, b) => {
        if (b.labelT === search) return 1;
        if (a.labelT === search) return -1;
        const aStarts = a.labelT.startsWith(search);
        const bStarts = b.labelT.startsWith(search);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return 0;
      })
      .map(({ labelT: _1, keyWordsT: _2, ...button }) => button);

    return filtered;
  }, [searchQuery, t]);

  return (
    <Animated.View
      style={styles.container}
      layout={LinearTransition.duration(300).springify()}
    >
      {isLoggedIn && (
        <Animated.View
          layout={LinearTransition.duration(200).springify()}
          exiting={FadeOutLeft.duration(200).springify()}
          entering={FadeInRight.duration(200).springify()}
        >
          <Button mode="contained" onPress={sessionManager.logout}>
            <Text style={styles.subtitle}>{t("common.logout")}</Text>
          </Button>

          <Animated.Text
            style={styles.title}
            layout={LinearTransition.duration(200).springify()}
          >
            {t("user.welcomeUser", {
              user:
                sessionManager.getSessionData().userData?.name ||
                t("user.dearUser"),
            })}
          </Animated.Text>
        </Animated.View>
      )}

      {(!isLoggedIn || loggingIn) && (
        <Animated.View
          layout={LinearTransition.duration(200).springify()}
          exiting={FadeOutLeft.duration(200).springify()}
          entering={FadeInRight.duration(200).springify()}
        >
          <Button mode="contained" onPress={handleLoginPress}>
            <Text style={styles.subtitle}>
              {t(`auth.${loggingIn ? "loggingIn" : "loginButton"}`)}
            </Text>
          </Button>
        </Animated.View>
      )}

      {!hasInternet && (
        <Animated.Text
          style={styles.doesNotHaveInternet}
          layout={LinearTransition.duration(200).springify()}
          exiting={FadeOutLeft.duration(200).springify()}
          entering={FadeInRight.duration(200).springify()}
        >
          {t("common.NoInternetConnection")}
          {"\n"}
          {t("common.PleaseCheckInternetConnection")}
        </Animated.Text>
      )}

      <Animated.View layout={LinearTransition.duration(200).springify()}>
        <Searchbar
          value={searchQuery}
          placeholder={t("labels.search")}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

      <Animated.View
        style={styles.divider}
        layout={LinearTransition.duration(200).springify()}
      />

      <Animated.FlatList
        data={searchButtons || buttons}
        style={styles.scrollViewContainer}
        layout={LinearTransition.duration(200).springify()}
        renderItem={renderItem}
        contentContainerStyle={styles.scrollViewContentContainer}
      />

      {REPLACERS.isWeb && (
        <Animated.View
          style={styles.footer}
          layout={LinearTransition.duration(200).springify()}
        >
          <Animated.View layout={LinearTransition.duration(200).springify()}>
            <Tooltip
              title={t("homeScreen.help", {
                commandToHome: "Ctrl + H",
              })}
              enterTouchDelay={300}
              leaveTouchDelay={1500}
            >
              <Icon size={25} source={"help-circle-outline"} />
            </Tooltip>
          </Animated.View>

          <Animated.Text
            style={styles.h3}
            layout={LinearTransition.duration(200).springify()}
          >
            {t("appInfo.appVersion", {
              version: DATA_PLATFORM.version,
            })}
          </Animated.Text>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default memoDeep(HomeScreen);
