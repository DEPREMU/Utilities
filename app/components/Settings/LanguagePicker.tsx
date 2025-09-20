import { List } from "react-native-paper";
import { useTheme } from "@context/ThemeContext";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import React, { memo, useCallback, useMemo } from "react";
import { LanguagesSupported, RequestSupabaseUpdate } from "@types";
import { fetchOptions, getRouteAPI, languagesNames } from "@utils";

const LanguagePicker: React.FC = () => {
  const { colors } = useTheme();
  const { userData, sessionToken } = useUserContext();
  const { addTaskQueue } = useBackgroundTask();
  const { changeLanguage: changeLang, t, language } = useLanguage();

  const changeLanguage = useCallback(
    async (lang: LanguagesSupported) => {
      if (!userData?.userId) return;
      const id =
        Date.now().toString() + Math.random().toString(36).substring(2);

      addTaskQueue(
        async () => {
          if (!sessionToken) return navigateReplace("Login");

          fetch(
            await getRouteAPI("/supabase/update"),
            fetchOptions<RequestSupabaseUpdate>("POST", {
              lang,
              match: { userId: userData?.userId },
              table: "UserConfig",
              token: sessionToken,
              values: { language: lang },
            }),
          );
        },
        true,
        {
          id,
          functionName: "updateFromSupabase",
          args: ["UserConfig", { language: lang }, { userId: userData.userId }],
        },
        id
      );
      await changeLang(lang);
    },
    [changeLang, addTaskQueue, userData?.userId],
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
    [changeLanguage, language, colors, t],
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
