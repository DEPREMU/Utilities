import React, { memo, useCallback, useMemo } from "react";
import { List } from "react-native-paper";
import { Theme } from "@types";
import { useTheme } from "@context/ThemeContext";
import { useLanguage } from "@context/LanguageContext";
import { updateInTable } from "@utils";
import { useUserContext } from "@context/UserContext";
import { useBackgroundTask } from "@/context/BackgroundTaskContext";

const ThemePicker: React.FC = () => {
  const { t } = useLanguage();
  const { userData } = useUserContext();
  const { addTaskQueue } = useBackgroundTask();
  const { themeState, setThemeState, colors } = useTheme();

  const changeTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      if (!userData?.uid) return;
      addTaskQueue(async () => {
        await updateInTable(
          "UserConfig",
          { theme: newTheme },
          { userId: userData.uid },
        );
      }, true);
    },
    [setThemeState, userData, addTaskQueue],
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
