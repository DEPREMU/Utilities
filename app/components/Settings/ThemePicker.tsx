import { List } from "react-native-paper";
import { useTheme } from "@context/ThemeContext";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { useBackgroundTask } from "@/context/BackgroundTaskContext";
import { fetchOptions, getRouteAPI } from "@/utils";
import { RequestSupabaseUpdate, Theme } from "@types";
import React, { memo, useCallback, useMemo } from "react";

const ThemePicker: React.FC = () => {
  const { t, language } = useLanguage();
  const { addTaskQueue } = useBackgroundTask();
  const { userData, sessionToken } = useUserContext();
  const { themeState, setThemeState, colors } = useTheme();

  const changeTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      if (!userData?.userId || !sessionToken) return;
      addTaskQueue(async () => {
        if (!userData?.userId || !sessionToken) return;

        await fetch(
          await getRouteAPI("/supabase/update"),
          fetchOptions<RequestSupabaseUpdate>("POST", {
            lang: language,
            table: "UserConfig",
            match: { userId: userData?.userId },
            values: { theme: newTheme },
            token: sessionToken,
          }),
        );
      }, true);
    },
    [setThemeState, userData, addTaskQueue, sessionToken, language],
  );

  const renderAccordionItem = useMemo(() => {
    return ["auto", "light", "dark"].map((key) => (
      <List.Item
        key={key}
        title={t(key as Theme)}
        left={(props) => (
          <List.Icon
            {...props}
            color={themeState === key ? colors.primary : colors.text}
            icon={themeState === key ? "radiobox-marked" : "radiobox-blank"}
          />
        )}
        onPress={() => changeTheme(key as Theme)}
      />
    ));
  }, [themeState, colors, t, changeTheme]);

  return (
    <List.Accordion
      title={t("setTheme")}
      left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
    >
      {renderAccordionItem}
    </List.Accordion>
  );
};

const ThemePickerMemo = memo(ThemePicker);

export default ThemePickerMemo;
