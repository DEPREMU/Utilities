import Button from "@components/common/ButtonComponent";
import Constants from "expo-constants";
import ThemePicker from "@components/Settings/ThemePicker";
import Notifications from "@components/Settings/Notifications";
import LanguagePicker from "@components/Settings/LanguagePicker";
import { useLanguage } from "@context/LanguageContext";
import { useWebSocket } from "@context/WebSocketContext";
import { RequestSupabaseUpdate, typeLanguages } from "@types";
import { useUserContext } from "@context/UserContext";
import { Text, TextInput } from "react-native-paper";
import { ScrollView, View } from "react-native";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import useStylesSettingsScreen from "@styles/screens/useStylesSettingsScreen";
import { useDeviceInformation } from "@context/DeviceInformationContext";
import { fetchOptions, getRouteAPI, loadData, log, saveData } from "@utils";
import React, { useCallback, useEffect, useState } from "react";

type Section = {
  subtitle: keyof typeLanguages;
  labelTextInput: keyof typeLanguages;
  value: string | null;
  onChangeText: (text: string) => void;
  placeholder?: string;
  handlePress: () => void;
  labelButton: keyof typeLanguages;
};

const SettingsScreen: React.FC = () => {
  const { styles } = useStylesSettingsScreen();
  const { t, language } = useLanguage();
  const { hasInternet } = useDeviceInformation();
  const { addTaskQueue } = useBackgroundTask();
  const { setSocketURL } = useWebSocket();
  const { userData, sessionToken } = useUserContext();

  const [apiURL, setApiURL] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [hasAdmin, setHasAdmin] = useState<boolean>(false);
  const [socketURL, setSocketURLState] = useState<string | null>(null);
  const [isOtherScrollActive, setIsOtherScrollActive] =
    useState<boolean>(false);

  const handleCheckPasswordAdminSection = useCallback(async () => {
    const adminPassword = Constants.expoConfig?.extra?.ADMIN_PASSWORD;
    log("Checking admin password:", password, "against:", adminPassword);
    if (!password || !adminPassword) return;

    if (password === adminPassword) {
      setHasAdmin(true);
      await saveData("@hasAdminAccess", true);
    }
  }, [password]);

  const saveApiURL = useCallback(async () => {
    if (!apiURL || !userData?.userId) return;
    const id =
      Date.now().toString() + Math.random().toString(36).substring(2, 8);

    addTaskQueue(
      async () => {
        if (!userData?.userId) return;
        if (!sessionToken) return;

        await fetch(
          await getRouteAPI("/supabase/update"),
          fetchOptions<RequestSupabaseUpdate>(
            "POST",
            {
              lang: language,
              match: { userId: userData.userId },
              table: "UserConfig",
              values: { API_URL: apiURL },
            },
            sessionToken,
          ),
        );
        await saveData("@API_URL", apiURL);
      },
      true,
      {
        id,
        functionName: "updateFromSupabase",
        args: ["UserConfig", { API_URL: apiURL }, { userId: userData.userId }],
      },
      id,
    );
  }, [apiURL, addTaskQueue, userData?.userId, sessionToken, language]);

  const saveSocketURL = useCallback(async () => {
    if (!socketURL || !userData?.userId) return;
    const id =
      Date.now().toString() + Math.random().toString(36).substring(2, 8);

    setSocketURL(socketURL);
    addTaskQueue(
      async () => {
        if (!userData?.userId) return;
        if (!sessionToken) return;

        await fetch(
          await getRouteAPI("/supabase/update"),
          fetchOptions<RequestSupabaseUpdate>(
            "POST",
            {
              lang: language,
              match: { userId: userData.userId },
              table: "UserConfig",
              values: { webSocketURL: socketURL },
            },
            sessionToken,
          ),
        );
        await saveData("@webSocketURL", socketURL);
      },
      true,
      {
        id,
        functionName: "updateFromSupabase",
        args: [
          "UserConfig",
          { webSocketURL: socketURL },
          { userId: userData.userId },
        ],
      },
      id,
    );
  }, [
    socketURL,
    setSocketURL,
    addTaskQueue,
    userData?.userId,
    sessionToken,
    language,
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

  const handleOtherScrollActive = useCallback((touching: boolean) => {
    setIsOtherScrollActive(touching);
  }, []);

  useEffect(() => {
    loadData("@hasAdminAccess").then((data) => {
      setHasAdmin(data || false);
    });
    loadData("@webSocketURL").then((data) => {
      setSocketURLState(data || "");
    });
    loadData("@API_URL").then((data) => {
      setApiURL(data || "");
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
              <Notifications onScrollableAreaTouch={handleOtherScrollActive} />
            </View>
          )}
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
