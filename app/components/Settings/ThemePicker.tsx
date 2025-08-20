import React from "react";
import { List } from "react-native-paper";
import { Theme } from "@types";
import { useTheme } from "@context/ThemeContext";
import { useLanguage } from "@context/LanguageContext";

const ThemePicker: React.FC = () => {
  const { t } = useLanguage();
  const { themeState, setThemeState, primary, text } = useTheme();

  return (
    <>
      <List.Accordion
        title={t("setTheme")}
        left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
      >
        {["auto", "light", "dark"].map((key) => (
          <List.Item
            key={key}
            title={t(key as Theme)}
            left={(props) => (
              <List.Icon
                {...props}
                color={themeState === key ? primary : text}
                icon={themeState === key ? "radiobox-marked" : "radiobox-blank"}
              />
            )}
            onPress={() => setThemeState(key as Theme)}
          />
        ))}
      </List.Accordion>
    </>
  );
};

export default ThemePicker;
