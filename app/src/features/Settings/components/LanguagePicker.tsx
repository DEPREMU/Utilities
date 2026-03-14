import {
  memoDeep,
  navigation,
  fetchToServer,
  languagesNames,
  sessionManager,
  storageManagement,
} from "@utils";
import { List } from "react-native-paper";
import { useTheme } from "@context/ThemeContext";
import { useLanguage } from "@context/LanguageContext";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import { LanguagesSupported } from "@types";
import React, { useMemo, useRef } from "react";

const LanguagePicker: React.FC = () => {
  const { colors } = useTheme();
  const { addTaskQueueRef } = useBackgroundTask();
  const { changeLanguageRef: changeLanguage, t, language } = useLanguage();

  const changeLanguageRef = useRef(async (lang: LanguagesSupported) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2);
    const { sessionToken, userData } = sessionManager.getSessionData();

    if (sessionToken && userData?.userId)
      addTaskQueueRef.current(
        {
          requiresInternet: true,
          func: async () => {
            if (!sessionToken) return navigation.replace("Login");
            const deviceId = storageManagement.get("DEVICE_ID");

            fetchToServer(
              "/database/update",
              {
                lang,
                match: { userId: userData?.userId },
                table: "UserConfig",
                values: { language: lang },
                deviceId,
              },
              sessionToken,
            );
          },
        },
        {
          id,
          functionName: "updateFromDatabase",
          args: ["UserConfig", { language: lang }, { userId: userData.userId }],
        },
        id,
      );
    await changeLanguage.current(lang);
  });

  const itemsRendered = useMemo(
    () =>
      Object.entries(languagesNames).map(([key, value]) => (
        <List.Item
          key={key}
          title={value}
          left={(props) => (
            <List.Icon
              {...props}
              color={language === key ? colors.primary : colors.text}
              icon={language === key ? "radiobox-marked" : "radiobox-blank"}
            />
          )}
          onPress={() => changeLanguageRef.current(key as LanguagesSupported)}
        />
      )),
    [language, colors],
  );

  return (
    <>
      <List.Accordion
        title={t("settings.setLanguage")}
        left={(props) => <List.Icon {...props} icon="translate" />}
      >
        {itemsRendered}
      </List.Accordion>
    </>
  );
};

export default memoDeep(LanguagePicker);
