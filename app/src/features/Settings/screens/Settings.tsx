import {
  URLS,
  debug,
  alerts,
  openURL,
  updates,
  memoDeep,
  deviceInfo,
  navigation,
  APP_VERSION,
  sessionManager,
  DEBUG_SETTINGS,
  EventsDeviceInfo,
  getFormattedDate,
  storageManagement,
  getDevicePushToken,
} from "@utils";
import Button from "@components/Button/screens";
import ThemePicker from "@screens/Settings/components/ThemePicker";
import { cloneDeep } from "lodash";
import { background } from "@/utils/services/background";
import LanguagePicker from "@screens/Settings/components/LanguagePicker";
import { useLanguage } from "@context/LanguageContext";
import { useWebSocket } from "@context/WebSocketContext";
import { useUserContext } from "@context/UserContext";
import { ScrollView, View } from "react-native";
import { AppTranslationsKeys } from "@types";
import useStylesSettingsScreen from "@screens/Settings/styles/useStylesSettingsScreen";
import { Timers, REPLACERS, ServerFetch } from "@common";
import { ActivityIndicator, Switch, Text, TextInput } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

type Section = {
  subtitle: AppTranslationsKeys;
  labelTextInput: AppTranslationsKeys;
  value: string | null;
  onChangeText: (text: string) => void;
  placeholder?: string;
  handlePress: () => void;
  labelButton: AppTranslationsKeys;
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
        "common.error",
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
      "common.debugStateChanged" as never,
      `common.appAliveState${!exists ? "Disabled" : "Enabled"}` as never,
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
  const { isLoggedIn } = useUserContext();
  const { t, dynamicT } = useLanguage();
  const { setSocketURL } = useWebSocket();
  const { styles, colors } = useStylesSettingsScreen();

  const [hasInternet, setHasInternet] = useState<boolean>(
    deviceInfo.hasInternet,
  );
  const [apiURL, setApiURL] = useState<string>(
    storageManagement.get("API_URL", ""),
  );
  const [hasAdmin, setHasAdmin] = useState<boolean>(
    storageManagement.get("HAS_ADMIN_ACCESS", false),
  );
  const [errorAdmin, setErrorAdmin] = useState<string | null>(null);
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

  const errorTimeoutRef = useRef<number | null>(null);

  const handleCheckForUpdatesRef = useRef(async () => {
    if (REPLACERS.isWeb) return;

    storageManagement.save("LAST_UPDATE_CHECK", Date.now());
    setUpdatesData({
      updateState: "NOT_VERIFIED",
      lastUpdateCheck: new Date(),
      lookingForUpdates: true,
    });

    const hasUpdate = await updates?.checkForUpdates();

    Timers.setTimeout(() => {
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
    const updatesWebPageUrl = URLS.api.replace("api", "updates/web-page");
    REPLACERS.Logger.log("Opening updates web page URL:", updatesWebPageUrl);
    openURL(updatesWebPageUrl);
  });

  const toggleNetworkCellular = useRef(async () => {
    const networkInfo = deviceInfo.fetchNetworkInfo;

    deviceInfo.setFetchWithCellularData(!networkInfo.fetchWithCellularData);

    setFetchWithCellularData(!networkInfo.fetchWithCellularData);
  });

  const handleCheckPasswordAdminSection = useCallback(async () => {
    if (!password) return;

    const { userData, sessionToken } = sessionManager.getSessionData();

    if (!userData?.userId || !sessionToken) return;

    const setError = (error: string) => {
      setErrorAdmin(error);

      if (errorTimeoutRef.current) Timers.clearTimeout(errorTimeoutRef.current);

      errorTimeoutRef.current = Timers.setTimeout(() => {
        setErrorAdmin(null);
        errorTimeoutRef.current = null;
      }, 5000);
    };

    try {
      const deviceId = storageManagement.get("DEVICE_ID");

      const res = await ServerFetch.post(
        "/admin/unlock",
        { deviceId, password },
        sessionToken,
      );

      if (res.data.success) {
        setHasAdmin(true);
        storageManagement.save("HAS_ADMIN_ACCESS", true);
      } else if (res.data.error) {
        setError(res.data.error);
      }
    } catch (error) {
      REPLACERS.Logger.error("Error checking admin password:", error);

      setError((error as Error).message);
    }
  }, [password]);

  const saveApiURL = useCallback(async () => {
    const { userData, sessionToken } = sessionManager.getSessionData();

    if (!apiURL || !userData?.userId) return;

    background.addTaskQueue(
      {
        arguments: [],
        function: async () => {
          if (!userData?.userId) return;
          if (!sessionToken) return;

          const deviceId = storageManagement.get("DEVICE_ID");

          try {
            const res = await ServerFetch.put(
              "/user-config/update",
              {
                values: { API_URL: apiURL },
                deviceId,
              },
              sessionToken,
            );

            if (res.data.success) storageManagement.save("API_URL", apiURL);
          } catch (error) {
            REPLACERS.Logger.error("Error updating user config:", error);
          }
        },
      },
      true,
    );
  }, [apiURL]);

  const saveSocketURL = useCallback(async () => {
    const { userData, sessionToken } = sessionManager.getSessionData();

    if (!socketURL || !userData?.userId) return;

    setSocketURL(socketURL);
    background.addTaskQueue(
      {
        arguments: [],
        function: async () => {
          if (!userData?.userId) return;
          if (!sessionToken) return;

          const deviceId = storageManagement.get("DEVICE_ID");

          try {
            const res = await ServerFetch.put(
              "/user-config/update",
              {
                values: { webSocketURL: socketURL },
                deviceId,
              },
              sessionToken,
            );

            if (res.data.success)
              storageManagement.save("WEBSOCKET_URL", socketURL);
          } catch (error) {
            REPLACERS.Logger.error("Error updating user config:", error);
          }
        },
      },
      true,
    );
  }, [socketURL, setSocketURL]);

  const renderSectionsAdmin = useCallback(() => {
    const sections: Section[] = [
      {
        subtitle: "settings.setApiURL",
        labelTextInput: "settings.apiURL",
        value: apiURL,
        onChangeText: setApiURL,
        placeholder: "https://api.example.com",
        handlePress: saveApiURL,
        labelButton: "labels.save",
      },
      {
        subtitle: "settings.setWebSocketURL",
        labelTextInput: "settings.webSocketURL",
        value: socketURL,
        onChangeText: setSocketURLState,
        placeholder: "wss://socket.example.com",
        handlePress: saveSocketURL,
        labelButton: "labels.save",
      },
    ];

    return sections.map((section, index) => (
      <View style={styles.section} key={index}>
        <Text style={styles.subtitle}>{dynamicT(section.subtitle)}</Text>
        <TextInput
          label={dynamicT(section.labelTextInput)}
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
            label={dynamicT(section.labelButton)}
          />
        </View>
      </View>
    ));
  }, [apiURL, socketURL, styles, dynamicT, saveApiURL, saveSocketURL]);

  useEffect(() => {
    const hasInternetListener = deviceInfo.addEventListener(
      EventsDeviceInfo.hasInternetChange,
      (hasInternet) => setHasInternet(hasInternet),
    );

    return () => {
      hasInternetListener.remove();
    };
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
              {t(
                REPLACERS.isNative
                  ? "updates.lastUpdateCheck"
                  : "appInfo.appUpdates",
              )}
            </Text>
            <Text style={styles.dateText}>
              {t("appInfo.currentVersion", { version: APP_VERSION })}
            </Text>
            <Text style={styles.dateText}>
              {REPLACERS.isNative
                ? getFormattedDate(updatesData?.lastUpdateCheck || new Date())
                : t("appInfo.appUpdatesExplanation")}
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
                  <Text style={styles.buttonLabel}>
                    {t("updates.noUpdates")}
                  </Text>
                ) : updatesData?.updateState === "NOT_VERIFIED" ? (
                  <Text style={styles.buttonLabel}>
                    {t("updates.checkForUpdates")}
                  </Text>
                ) : updatesData?.updateState === "UPDATE_AVAILABLE" ? (
                  <Text style={styles.buttonLabel}>
                    {t("updates.updateAvailable")}
                  </Text>
                ) : null}
              </Button>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.subtitle}>
              {t("updates.ourUpdatesWebPage")}
            </Text>
            <Button
              customStyles={{
                button: styles.button,
                textButton: styles.buttonLabel,
              }}
              handlePress={openUrlUpdatesWebPageRef.current}
              label={t("updates.openUpdatesWebPage")}
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
              <Text style={styles.subtitle}>{t("auth.qr.loginWithQR")}</Text>

              <Text style={styles.infoText}>
                {t("auth.qr.loginWithQRExplanation")}
              </Text>

              <Button
                label={t("auth.qr.loginWithQR")}
                handlePress={() => navigation.replace("ScanQRCode")}
              />
            </View>
          )}

          {!REPLACERS.isProduction && isLoggedIn && <DebugComponent />}

          {!hasAdmin && (
            <View style={styles.section}>
              <Text style={styles.subtitle}>{t("settings.adminSection")}</Text>

              {!!errorAdmin && (
                <Text style={styles.infoText}>{errorAdmin}</Text>
              )}

              <View style={styles.inputContainer}>
                <TextInput
                  secureTextEntry
                  mode="outlined"
                  value={password}
                  label={t("settings.passwordAdminSection")}
                  onChangeText={setPassword}
                />
              </View>
              <View style={styles.buttonContainer}>
                <Button
                  label={t("auth.checkPassword")}
                  handlePress={handleCheckPasswordAdminSection}
                  customStyles={{
                    button: styles.button,
                    textButton: styles.buttonLabel,
                  }}
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
