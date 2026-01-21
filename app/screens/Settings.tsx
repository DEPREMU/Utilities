import {
  log,
  openURL,
  API_URL,
  showAlert,
  APP_VERSION,
  getRouteAPI,
  fetchToServer,
  ADMIN_PASSWORD,
  loadDataStorage,
  saveDataStorage,
  getFormattedDate,
  setTimeoutPolyfill,
  fetchAndApplyUpdate,
  isNewUpdateAvailable,
  tTyped,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import ThemePicker from "@components/Settings/ThemePicker";
import { cloneDeep } from "lodash";
import Notifications from "@components/Settings/Notifications";
import LanguagePicker from "@components/Settings/LanguagePicker";
import { useLanguage } from "@context/LanguageContext";
import { useWebSocket } from "@context/WebSocketContext";
import { useBackground } from "@context/BackgroundContext";
import { useUserContext } from "@context/UserContext";
import { typeLanguagesKeys } from "@types";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import useStylesSettingsScreen from "@styles/screens/useStylesSettingsScreen";
import { ScrollView, View, Platform } from "react-native";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

type Section = {
  subtitle: typeLanguagesKeys;
  labelTextInput: typeLanguagesKeys;
  value: string | null;
  onChangeText: (text: string) => void;
  placeholder?: string;
  handlePress: () => void;
  labelButton: typeLanguagesKeys;
};

type UpdatesData = {
  updateState: "NO_UPDATES" | "NOT_VERIFIED";
  lastUpdateCheck: Date;
  lookingForUpdates: boolean;
};

const getDefaultUpdatesData = (): UpdatesData => ({
  updateState: "NOT_VERIFIED",
  lastUpdateCheck: new Date(),
  lookingForUpdates: false,
});

const SettingsScreen: React.FC = () => {
  const { t, language } = useLanguage();
  const { hasInternet } = useBackground();
  const { setSocketURL } = useWebSocket();
  const { styles, colors } = useStylesSettingsScreen();
  const { addTaskQueueRef } = useBackgroundTask();
  const { userData, sessionToken } = useUserContext();

  const [apiURL, setApiURL] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [hasAdmin, setHasAdmin] = useState<boolean>(false);
  const [socketURL, setSocketURLState] = useState<string | null>(null);
  const [updatesData, setUpdatesData] = useState<UpdatesData>(
    getDefaultUpdatesData(),
  );
  const [isOtherScrollActive, setIsOtherScrollActive] =
    useState<boolean>(false);

  const handleCheckForUpdatesRef = useRef(async () => {
    if (Platform.OS === "web") return;

    saveDataStorage("LAST_UPDATE_CHECK", Date.now());
    setUpdatesData({
      updateState: "NOT_VERIFIED",
      lastUpdateCheck: new Date(),
      lookingForUpdates: true,
    });

    const hasUpdate = await isNewUpdateAvailable();
    if (!hasUpdate) {
      setTimeoutPolyfill(() => {
        setUpdatesData((prevState) =>
          cloneDeep({
            ...prevState,
            updateState: "NO_UPDATES",
            lookingForUpdates: false,
          }),
        );
      }, 1000);
      return;
    }
    showAlert(
      tTyped("updateAvailable"),
      tTyped("updateAvailableMessage"),
      [
        {
          text: tTyped("later"),
          style: "cancel",
        },
        {
          text: tTyped("updateNow"),
          onPress: async () => {
            await fetchAndApplyUpdate();
          },
        },
      ],
      { cancelable: false },
    );
  });

  const handleOtherScrollActiveRef = useRef((touching: boolean) => {
    setIsOtherScrollActive(touching);
  });

  const handleCheckPasswordAdminSection = useCallback(async () => {
    log("Checking admin password:", password, "against:", ADMIN_PASSWORD);
    if (!password || !ADMIN_PASSWORD) return;
    if (!userData?.userId || !sessionToken) return;
    if (password !== ADMIN_PASSWORD) return;

    const [deviceId, url] = await Promise.all([
      loadDataStorage("DEVICE_ID"),
      getRouteAPI("/database/update"),
    ]);
    if (!url) return;

    setHasAdmin(true);
    saveDataStorage("HAS_ADMIN_ACCESS", true);

    await fetchToServer(
      "/database/update",
      {
        lang: language,
        match: { userId: userData?.userId },
        table: "UserConfig",
        values: { hasAdmin: true },
        deviceId,
      },
      sessionToken,
    );
  }, [password, userData?.userId, sessionToken, language]);

  const saveApiURL = useCallback(async () => {
    if (!apiURL || !userData?.userId) return;
    const id =
      Date.now().toString() + Math.random().toString(36).substring(2, 8);

    addTaskQueueRef.current(
      {
        requiresInternet: true,
        func: async () => {
          if (!userData?.userId) return;
          if (!sessionToken) return;

          const deviceId = await loadDataStorage("DEVICE_ID");

          await fetchToServer(
            "/database/update",
            {
              deviceId,
              lang: language,
              match: { userId: userData.userId },
              table: "UserConfig",
              values: { API_URL: apiURL },
            },
            sessionToken,
          );
          await saveDataStorage("API_URL", apiURL);
        },
      },
      {
        id,
        functionName: "updateFromDatabase",
        args: ["UserConfig", { API_URL: apiURL }, { userId: userData.userId }],
      },
      id,
    );
  }, [apiURL, addTaskQueueRef, userData?.userId, sessionToken, language]);

  const saveSocketURL = useCallback(async () => {
    if (!socketURL || !userData?.userId) return;
    const id =
      Date.now().toString() + Math.random().toString(36).substring(2, 8);

    setSocketURL(socketURL);
    addTaskQueueRef.current(
      {
        requiresInternet: true,
        func: async () => {
          if (!userData?.userId) return;
          if (!sessionToken) return;

          const deviceId = await loadDataStorage("DEVICE_ID");

          await fetchToServer(
            "/database/update",
            {
              lang: language,
              match: { userId: userData.userId },
              table: "UserConfig",
              deviceId,
              values: { webSocketURL: socketURL },
            },
            sessionToken,
          );
          await saveDataStorage("WEBSOCKET_URL", socketURL);
        },
      },
      {
        id,
        functionName: "updateFromDatabase",
        args: [
          "UserConfig",
          { webSocketURL: socketURL },
          { userId: userData.userId },
        ],
      },
      id,
    );
  }, [
    language,
    socketURL,
    userData?.userId,
    setSocketURL,
    sessionToken,
    addTaskQueueRef,
  ]);

  const renderSectionsAdmin = useCallback(() => {
    const sections: Section[] = [
      {
        subtitle: "setApiURL",
        labelTextInput: "apiURL",
        value: apiURL,
        onChangeText: setApiURL,
        placeholder: "https://api.example.com",
        handlePress: saveApiURL,
        labelButton: "save",
      },
      {
        subtitle: "setWebSocketURL",
        labelTextInput: "webSocketURL",
        value: socketURL,
        onChangeText: setSocketURLState,
        placeholder: "wss://socket.example.com",
        handlePress: saveSocketURL,
        labelButton: "save",
      },
    ];

    return sections.map((section, index) => (
      <View style={styles.section} key={index}>
        <Text style={styles.subtitle}>{t(section.subtitle)}</Text>
        <TextInput
          label={t(section.labelTextInput)}
          value={section.value || ""}
          onChangeText={section.onChangeText}
          mode="outlined"
          placeholder={section.placeholder}
        />
        <View style={styles.buttonContainer}>
          <Button
            customStyles={{
              button: styles.button,
              textButton: styles.buttonLabel,
            }}
            touchableOpacity
            handlePress={section.handlePress}
            label={t(section.labelButton)}
          />
        </View>
      </View>
    ));
  }, [apiURL, socketURL, styles, t, saveApiURL, saveSocketURL]);

  const openUrlUpdatesWebPage = useCallback(async () => {
    const updatesWebPageUrl = API_URL.replace("api", "updates/web-page");
    log("Opening updates web page URL:", updatesWebPageUrl);
    openURL(updatesWebPageUrl);
  }, []);

  useEffect(() => {
    loadDataStorage("HAS_ADMIN_ACCESS").then((data) => {
      setHasAdmin(data || false);
    });
    loadDataStorage("WEBSOCKET_URL").then((data) => {
      setSocketURLState(data || "");
    });
    loadDataStorage("API_URL").then((data) => {
      setApiURL(data || "");
    });
    loadDataStorage("LAST_UPDATE_CHECK").then((data) => {
      if (!data) return;

      setUpdatesData(getDefaultUpdatesData());
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        <Text style={styles.title}>{t("settings")}</Text>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          scrollEnabled={!isOtherScrollActive}
        >
          <View style={styles.section}>
            <ThemePicker />
          </View>
          <View style={styles.section}>
            <LanguagePicker />
          </View>

          {hasInternet && (
            <View style={styles.section}>
              <Text style={styles.subtitle}>{t("notifications")}</Text>
              <Notifications
                onScrollableAreaTouch={handleOtherScrollActiveRef.current}
              />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.subtitle}>
              {t(Platform.OS === "android" ? "lastUpdateCheck" : "appUpdates")}
            </Text>
            <Text style={styles.dateText}>
              {t("currentVersion", { version: APP_VERSION })}
            </Text>
            <Text style={styles.dateText}>
              {Platform.OS === "android"
                ? getFormattedDate(updatesData?.lastUpdateCheck || new Date())
                : t("appUpdatesExplanation")}
            </Text>
            {Platform.OS === "android" && (
              <Button
                customStyles={{
                  button: styles.button,
                  textButton: styles.buttonLabel,
                }}
                disabled={updatesData?.lookingForUpdates}
                handlePress={handleCheckForUpdatesRef.current}
              >
                {updatesData?.lookingForUpdates ? (
                  <ActivityIndicator
                    style={styles.activityIndicator}
                    color={colors.background}
                  />
                ) : updatesData?.updateState === "NO_UPDATES" ? (
                  <Text style={styles.buttonLabel}>{t("noUpdates")}</Text>
                ) : updatesData?.updateState === "NOT_VERIFIED" ? (
                  <Text style={styles.buttonLabel}>{t("checkForUpdates")}</Text>
                ) : null}
              </Button>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.subtitle}>{t("ourUpdatesWebPage")}</Text>
            <Button
              customStyles={{
                button: styles.button,
                textButton: styles.buttonLabel,
              }}
              handlePress={openUrlUpdatesWebPage}
              label={t("openUpdatesWebPage")}
            />
          </View>

          {!hasAdmin && (
            <View style={styles.section}>
              <Text style={styles.subtitle}>{t("adminSection")}</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  label={t("passwordAdminSection")}
                  onChangeText={setPassword}
                  value={password}
                  secureTextEntry
                  mode="outlined"
                />
              </View>
              <View style={styles.buttonContainer}>
                <Button
                  customStyles={{
                    button: styles.button,
                    textButton: styles.buttonLabel,
                  }}
                  handlePress={handleCheckPasswordAdminSection}
                  label={t("checkPassword")}
                />
              </View>
            </View>
          )}
          {hasAdmin && renderSectionsAdmin()}
        </ScrollView>
      </View>
    </View>
  );
};

export default SettingsScreen;
