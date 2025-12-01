import { List } from "react-native-paper";
import { useTheme } from "@context/ThemeContext";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import { LanguagesSupported } from "@types";
import React, { memo, useCallback, useMemo } from "react";
import { languagesNames, loadDataSecure, fetchToServer } from "@utils";

const LanguagePicker: React.FC = () => {
  const { colors } = useTheme();
  const { userData, sessionToken } = useUserContext();
  const { addTaskQueue } = useBackgroundTask();
  const { changeLanguage: changeLang, t, language } = useLanguage();

  const changeLanguage = useCallback(
    async (lang: LanguagesSupported) => {
      const id =
        Date.now().toString() + Math.random().toString(36).substring(2);

      if (sessionToken && userData?.userId)
        addTaskQueue(
          {
            requiresInternet: true,
            func: async () => {
              if (!sessionToken) return navigateReplace("Login");
              const deviceId = await loadDataSecure("_deviceId");

              fetchToServer(
                "/database/update",
                {
                  lang,
                  match: { userId: userData?.userId },
                  table: "UserConfig",
                  values: { language: lang },
                  deviceId: deviceId || "local-device",
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
      await changeLang(lang);
    },
    [changeLang, addTaskQueue, userData?.userId, sessionToken],
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
        title={t("setLanguage")}
        left={(props) => <List.Icon {...props} icon="translate" />}
      >
        {itemsRendered}
      </List.Accordion>
    </>
  );
};

const LanguagePickerMemo = memo(LanguagePicker);

export default LanguagePickerMemo;
