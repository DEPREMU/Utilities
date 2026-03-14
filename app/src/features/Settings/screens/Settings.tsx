import {
  debug,
  alerts,
  logger,
  openURL,
  API_URL,
  updates,
  memoDeep,
  REPLACERS,
  deviceInfo,
  navigation,
  APP_VERSION,
  getRouteAPI,
  fetchToServer,
  ADMIN_PASSWORD,
  sessionManager,
  DEBUG_SETTINGS,
  EventsDeviceInfo,
  getFormattedDate,
  storageManagement,
  setTimeoutPolyfill,
  getDevicePushToken,
} from "@utils";
import Button from "@/common/components/Button/screens";
import ThemePicker from "@screens/Settings/components/ThemePicker";
import { cloneDeep } from "lodash";
import LanguagePicker from "@screens/Settings/components/LanguagePicker";
import { useLanguage } from "@context/LanguageContext";
import { useWebSocket } from "@context/WebSocketContext";
import { useUserContext } from "@context/UserContext";
import { ScrollView, View } from "react-native";
import { typeLanguagesKeys } from "@types";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import useStylesSettingsScreen from "@screens/Settings/styles/useStylesSettingsScreen";
import { ActivityIndicator, Switch, Text, TextInput } from "react-native-paper";
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
  updateState: "NO_UPDATES" | "NOT_VERIFIED" | "UPDATE_AVAILABLE";
  lastUpdateCheck: Date;
  lookingForUpdates: boolean;
};

const getDefaultUpdatesData = (): UpdatesData => ({
  updateState: "NOT_VERIFIED",
  lastUpdateCheck: new Date(),
  lookingForUpdates: false,
});

const DebugComponent: React.FC = memoDeep(() => {
  const { styles } = useStylesSettingsScreen();

  const [states, setStates] = useState<DEBUG_SETTINGS>({
    appAliveCheck: false,
  });

  const handlePressAppAliveRef = useRef(async () => {
    const pushToken = await getDevicePushToken();
    if (!pushToken) {
      alerts.showAlert(
        "error",
        "Unable to get device push token. App alive state cannot be toggled." as never,
        async () => {},
      );
      return;
    }

    const exists = await debug?.toggleInterval("appAliveCheck");
    setStates((prev) => {
      const newState = cloneDeep(prev);
      newState.appAliveCheck = !!exists;

      return newState;
    });

    alerts.showAlert(
      "Debug state changed" as never,
      `App alive state is now ${!exists ? "disabled" : "enabled"}.` as never,
      async () => {},
    );
  });

  useEffect(() => {
    const load = async () => {
      const data = await debug?.getSettings();
      if (data) setStates(data);
    };
    load();
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.subtitle}>
        {
          // eslint-disable-next-line react/jsx-no-literals
          "Debug Functions (Only visible in debug mode)"
        }
      </Text>

      <Button
        label={
          "Watch state of app " +
          (states.appAliveCheck ? "(Enabled)" : "(Disabled)")
        }
        handlePress={handlePressAppAliveRef.current}
      />
    </View>
  );
});

const SettingsScreen: React.FC = () => {
  const { t } = useLanguage();
  const { isLoggedIn } = useUserContext();
  const { setSocketURL } = useWebSocket();
  const { styles, colors } = useStylesSettingsScreen();
  const { addTaskQueueRef } = useBackgroundTask();

  const [hasInternet, setHasInternet] = useState<boolean>(
    deviceInfo.hasInternet,
  );
  const [apiURL, setApiURL] = useState<string>(
    storageManagement.get("API_URL", ""),
  );
  const [hasAdmin, setHasAdmin] = useState<boolean>(
    storageManagement.get("HAS_ADMIN_ACCESS", false),
  );
  const [socketURL, setSocketURLState] = useState<string>(
    storageManagement.get("WEBSOCKET_URL", ""),
  );
  const [updatesData, setUpdatesData] = useState<UpdatesData>(
    getDefaultUpdatesData(),
  );
  const [password, setPassword] = useState<string>("");
  const [fetchWithCellularData, setFetchWithCellularData] = useState<boolean>(
    deviceInfo.fetchNetworkInfo.fetchWithCellularData,
  );

  const handleCheckForUpdatesRef = useRef(async () => {
    if (REPLACERS.isWeb) return;

    storageManagement.save("LAST_UPDATE_CHECK", Date.now());
    setUpdatesData({
      updateState: "NOT_VERIFIED",
      lastUpdateCheck: new Date(),
      lookingForUpdates: true,
    });

    const hasUpdate = await updates?.checkForUpdates();

    setTimeoutPolyfill(() => {
      setUpdatesData((prevState) =>
        cloneDeep({
          ...prevState,
          updateState: hasUpdate ? "UPDATE_AVAILABLE" : "NO_UPDATES",
          lookingForUpdates: false,
        }),
      );
    }, 1000);
  });

  const openUrlUpdatesWebPageRef = useRef(async () => {
    const updatesWebPageUrl = API_URL.replace("api", "updates/web-page");
    logger.log("Opening updates web page URL:", updatesWebPageUrl);
    openURL(updatesWebPageUrl);
  });

  const toggleNetworkCellular = useRef(async () => {
    const networkInfo = deviceInfo.fetchNetworkInfo;

    deviceInfo.setFetchWithCellularData(!networkInfo.fetchWithCellularData);

    setFetchWithCellularData(!networkInfo.fetchWithCellularData);
  });

  const handleCheckPasswordAdminSection = useCallback(async () => {
    if (!password || !ADMIN_PASSWORD) return;

    const { userData, sessionToken } = sessionManager.getSessionData();

    if (!userData?.userId || !sessionToken) return;
    if (password !== ADMIN_PASSWORD) return;

    const deviceId = storageManagement.get("DEVICE_ID");
    const url = await getRouteAPI("/database/update");
    if (!url) return;

    setHasAdmin(true);
    storageManagement.save("HAS_ADMIN_ACCESS", true);

    await fetchToServer(
      "/database/update",
      {
        lang: storageManagement.get("LANGUAGE"),
        match: { userId: userData?.userId },
        table: "UserConfig",
        values: { hasAdmin: true },
        deviceId,
      },
      sessionToken,
    );
  }, [password]);

  const saveApiURL = useCallback(async () => {
    const { userData, sessionToken } = sessionManager.getSessionData();

    if (!apiURL || !userData?.userId) return;
    const id =
      Date.now().toString() + Math.random().toString(36).substring(2, 8);

    addTaskQueueRef.current(
      {
        requiresInternet: true,
        func: async () => {
          if (!userData?.userId) return;
          if (!sessionToken) return;

          const deviceId = storageManagement.get("DEVICE_ID");

          await fetchToServer(
            "/database/update",
            {
              deviceId,
              lang: storageManagement.get("LANGUAGE"),
              match: { userId: userData.userId },
              table: "UserConfig",
              values: { API_URL: apiURL },
            },
            sessionToken,
          );
          storageManagement.save("API_URL", apiURL);
        },
      },
      {
        id,
        functionName: "updateFromDatabase",
        args: ["UserConfig", { API_URL: apiURL }, { userId: userData.userId }],
      },
      id,
    );
  }, [apiURL, addTaskQueueRef]);

  const saveSocketURL = useCallback(async () => {
    const { userData, sessionToken } = sessionManager.getSessionData();

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

          const deviceId = storageManagement.get("DEVICE_ID");

          await fetchToServer(
            "/database/update",
            {
              lang: storageManagement.get("LANGUAGE"),
              match: { userId: userData.userId },
              table: "UserConfig",
              deviceId,
              values: { webSocketURL: socketURL },
            },
            sessionToken,
          );
          storageManagement.save("WEBSOCKET_URL", socketURL);
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
  }, [socketURL, setSocketURL, addTaskQueueRef]);

  const renderSectionsAdmin = useCallback(() => {
    const sections: Section[] = [
      {
        subtitle: "settings.setApiURL",
        labelTextInput: "settings.apiURL",
        value: apiURL,
        onChangeText: setApiURL,
        placeholder: "https://api.example.com",
        handlePress: saveApiURL,
        labelButton: "save",
      },
      {
        subtitle: "settings.setWebSocketURL",
        labelTextInput: "settings.webSocketURL",
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

  useEffect(() => {
    const removeListener = deviceInfo.addEventListener(
      EventsDeviceInfo.hasInternetChange,
      (hasInternet) => setHasInternet(hasInternet),
    );

    return () => removeListener();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        <Text style={styles.title}>{t("common.settings")}</Text>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={styles.section}>
            <ThemePicker />
          </View>
          <View style={styles.section}>
            <LanguagePicker />
          </View>

          <View style={styles.section}>
            <Text style={styles.subtitle}>
              {t(REPLACERS.isNative ? "lastUpdateCheck" : "appUpdates")}
            </Text>
            <Text style={styles.dateText}>
              {t("currentVersion", { version: APP_VERSION })}
            </Text>
            <Text style={styles.dateText}>
              {REPLACERS.isNative
                ? getFormattedDate(updatesData?.lastUpdateCheck || new Date())
                : t("appUpdatesExplanation")}
            </Text>
            {REPLACERS.isNative && (
              <Button
                customStyles={{
                  button: styles.button,
                  textButton: styles.buttonLabel,
                }}
                disabled={updatesData?.lookingForUpdates || !hasInternet}
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
                ) : updatesData?.updateState === "UPDATE_AVAILABLE" ? (
                  <Text style={styles.buttonLabel}>{t("updateAvailable")}</Text>
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
              handlePress={openUrlUpdatesWebPageRef.current}
              label={t("openUpdatesWebPage")}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.subtitle}>
              {t("settings.toggleFetchCellularData")}
            </Text>

            <Text style={styles.infoText}>
              {t("settings.toggleFetchCellularDataExplanation")}
            </Text>

            <Switch
              color={colors.primary}
              value={fetchWithCellularData}
              onValueChange={toggleNetworkCellular.current}
            />
          </View>

          {REPLACERS.isNative && isLoggedIn && (
            <View style={styles.section}>
              <Text style={styles.subtitle}>{t("loginWithQR")}</Text>

              <Text style={styles.infoText}>{t("loginWithQRExplanation")}</Text>

              <Button
                label={t("loginWithQR")}
                handlePress={() => navigation.replace("ScanQRCode")}
              />
            </View>
          )}

          {!REPLACERS.isProduction && isLoggedIn && <DebugComponent />}

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

export default memoDeep(SettingsScreen);
