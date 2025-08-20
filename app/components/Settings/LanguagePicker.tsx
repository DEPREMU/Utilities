import React from "react";
import { List } from "react-native-paper";
import { useTheme } from "@context/ThemeContext";
import { useLanguage } from "@context/LanguageContext";
import { languagesNames } from "@utils";
import { LanguagesSupported } from "@types";

const LanguagePicker: React.FC = () => {
  const { primary, text } = useTheme();
  const { changeLanguage, t, language } = useLanguage();

  return (
    <>
      <List.Accordion
        title={t("setLanguage")}
        left={(props) => <List.Icon {...props} icon="translate" />}
      >
        {Object.entries(languagesNames).map(([key, value]) => (
          <List.Item
            key={key}
            title={value}
            left={(props) => (
              <List.Icon
                {...props}
                color={language === key ? primary : text}
                icon={language === key ? "radiobox-marked" : "radiobox-blank"}
              />
            )}
            onPress={() => changeLanguage(key as LanguagesSupported)}
          />
        ))}
      </List.Accordion>
    </>
  );
};

export default LanguagePicker;
