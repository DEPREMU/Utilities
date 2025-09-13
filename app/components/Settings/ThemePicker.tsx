import React, { memo, useMemo } from "react";
import { List } from "react-native-paper";
import { Theme } from "@types";
import { useTheme } from "@context/ThemeContext";
import { useLanguage } from "@context/LanguageContext";

const ThemePicker: React.FC = () => {
  const { t } = useLanguage();
  const { themeState, setThemeState, colors } = useTheme();

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
        onPress={() => setThemeState(key as Theme)}
      />
    ));
  }, [themeState, colors, t, setThemeState]);

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
