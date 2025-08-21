import Button from "@components/common/ButtonComponent";
import Constants from "expo-constants";
import Notifications from "@components/Settings/Notifications";
import LanguagePicker from "@components/Settings/LanguagePicker";
import { useLanguage } from "@context/LanguageContext";
import { useWebSocket } from "@context/WebSocketContext";
import { typeLanguages } from "@types";
import { Text, TextInput } from "react-native-paper";
import { ScrollView, View } from "react-native";
import useStylesSettingsScreen from "@styles/screens/useStylesSettingsScreen";
import { loadData, log, saveData } from "@utils";
import React, { useCallback, useEffect, useState } from "react";
import ThemePicker from "@/components/Settings/ThemePicker";

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
  const { t } = useLanguage();
  const { styles } = useStylesSettingsScreen();
  const { setSocketURL } = useWebSocket();

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
    if (!apiURL) return;

    await saveData("@API_URL", apiURL);
  }, [apiURL]);

  const saveSocketURL = useCallback(async () => {
    if (!socketURL) return;

    setSocketURL(socketURL);
    await saveData("@webSocketURL", socketURL);
  }, [socketURL, setSocketURL]);

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
    loadData<boolean>("@hasAdminAccess").then((data) => {
      setHasAdmin(data);
    });
    loadData<string>("@webSocketURL").then((data) => {
      setSocketURLState(data);
    });
    loadData<string>("@API_URL").then((data) => {
      setApiURL(data);
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
          <View style={styles.section}>
            <Text style={styles.subtitle}>{t("notifications")}</Text>
            <Notifications onScrollableAreaTouch={handleOtherScrollActive} />
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
