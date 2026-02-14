import { List } from "react-native-paper";
import { Theme } from "@types";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useUserContext } from "@/context/UserContext";
import { useBackgroundTask } from "@/context/BackgroundTaskContext";
import React, { useCallback, useMemo } from "react";
import { fetchToServer, storageManagement, memoDeep } from "@utils";

const ThemePicker: React.FC = () => {
  const { t } = useLanguage();
  const { addTaskQueueRef } = useBackgroundTask();
  const { userData, sessionToken } = useUserContext();
  const { themeState, setThemeState, colors } = useTheme();

  const changeTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      if (!userData?.userId || !sessionToken) return;
      addTaskQueueRef.current({
        requiresInternet: true,
        func: async () => {
          if (!userData?.userId || !sessionToken) return;
          const deviceId = storageManagement.get("DEVICE_ID");
          const lang = storageManagement.get("LANGUAGE");

          await fetchToServer(
            "/database/update",
            {
              lang,
              table: "UserConfig",
              deviceId,
              match: { userId: userData?.userId },
              values: { theme: newTheme },
            },
            sessionToken,
          );
        },
      });
    },
    [setThemeState, userData, addTaskQueueRef, sessionToken],
  );

  const renderAccordionItem = useMemo(() => {
    return ["auto", "light", "dark"].map((key) => (
      <List.Item
        key={key}
        title={t(`settings.${key as Theme}`)}
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
      title={t("settings.setTheme")}
      left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
    >
      {renderAccordionItem}
    </List.Accordion>
  );
};

const ThemePickerMemo = memoDeep(ThemePicker);

export default ThemePickerMemo;
