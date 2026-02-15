import {
  memoDeep,
  fetchToServer,
  sessionManager,
  storageManagement,
} from "@utils";
import { List } from "react-native-paper";
import { Theme } from "@types";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useBackgroundTask } from "@/context/BackgroundTaskContext";
import React, { useMemo, useRef } from "react";

const ThemePicker: React.FC = () => {
  const { t } = useLanguage();
  const { addTaskQueueRef } = useBackgroundTask();
  const { themeState, setThemeState, colors } = useTheme();

  const changeThemeRef = useRef((newTheme: Theme) => {
    const { sessionToken, userData } = sessionManager.getSessionData();

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
  });

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
        onPress={() => changeThemeRef.current(key as Theme)}
      />
    ));
  }, [themeState, colors, t]);

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
