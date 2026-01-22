import {
  memoDeep,
  fetchToServer,
  languagesNames,
  loadDataStorage,
} from "@utils";
import { List } from "react-native-paper";
import { useTheme } from "@context/ThemeContext";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import { LanguagesSupported } from "@types";
import React, { useCallback, useMemo } from "react";

const LanguagePicker: React.FC = () => {
  const { colors } = useTheme();
  const { userData, sessionToken } = useUserContext();
  const { addTaskQueueRef } = useBackgroundTask();
  const { changeLanguageRef, t, language } = useLanguage();

  const changeLanguage = useCallback(
    async (lang: LanguagesSupported) => {
      const id =
        Date.now().toString() + Math.random().toString(36).substring(2);

      if (sessionToken && userData?.userId)
        addTaskQueueRef.current(
          {
            requiresInternet: true,
            func: async () => {
              if (!sessionToken) return navigateReplace("Login");
              const deviceId = await loadDataStorage("DEVICE_ID");

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
            args: [
              "UserConfig",
              { language: lang },
              { userId: userData.userId },
            ],
          },
          id,
        );
      await changeLanguageRef.current(lang);
    },
    [changeLanguageRef, addTaskQueueRef, userData?.userId, sessionToken],
  );

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
          onPress={() => changeLanguage(key as LanguagesSupported)}
        />
      )),
    [changeLanguage, language, colors],
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

const LanguagePickerMemo = memoDeep(LanguagePicker);

export default LanguagePickerMemo;
