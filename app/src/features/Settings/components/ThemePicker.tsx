import { List } from "react-native-paper";
import { Theme } from "@types";
import { background } from "@/utils/services/background";
import { useLanguage } from "@context/LanguageContext";
import { useAppBehavior } from "@context/AppBehaviorContext";
import React, { useMemo, useRef } from "react";
import { REPLACERS, ServerFetch } from "@common";
import { memoDeep, sessionManager, storageManagement } from "@utils";

const ThemePicker: React.FC = () => {
  const { t } = useLanguage();
  const { appBehavior, setAppBehavior, colors } = useAppBehavior();

  const changeThemeRef = useRef((newTheme: Theme) => {
    const { sessionToken, userData } = sessionManager.getSessionData();

    setAppBehavior((v) => ({ ...v, theme: newTheme }));
    if (!userData?.userId || !sessionToken) return;

    background.addTaskQueue(
      {
        function: async () => {
          if (!userData?.userId || !sessionToken) return;
          const deviceId = storageManagement.get("DEVICE_ID");

          try {
            await ServerFetch.put(
              "/user-config/update",
              {
                body: { values: { theme: newTheme }, deviceId },
              },
              sessionToken,
            );
          } catch (error) {
            REPLACERS.Logger.error("Error updating user config:", error);
          }
        },
        arguments: [],
      },
      true,
    );
  });

  const renderAccordionItem = useMemo(() => {
    return (["auto", "light", "dark"] as const).map((key) => (
      <List.Item
        key={key}
        title={t(`settings.${key}`)}
        left={(props) => (
          <List.Icon
            {...props}
            color={appBehavior.theme === key ? colors.primary : colors.text}
            icon={
              appBehavior.theme === key ? "radiobox-marked" : "radiobox-blank"
            }
          />
        )}
        onPress={() => changeThemeRef.current(key)}
      />
    ));
  }, [appBehavior.theme, colors, t]);

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
