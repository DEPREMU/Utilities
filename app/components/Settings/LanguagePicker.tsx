import React, { memo, useCallback, useMemo } from "react";
import { List } from "react-native-paper";
import { useTheme } from "@context/ThemeContext";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { useBackgroundTask } from "@context/BackgroundTaskContext";
import { LanguagesSupported } from "@types";
import { languagesNames, updateInTable } from "@utils";

const LanguagePicker: React.FC = () => {
  const { colors } = useTheme();
  const { userData } = useUserContext();
  const { addTaskQueue } = useBackgroundTask();
  const { changeLanguage: changeLang, t, language } = useLanguage();

  const changeLanguage = useCallback(
    async (lang: LanguagesSupported) => {
      await changeLang(lang);

      if (!userData?.uid) return;

      addTaskQueue(async () => {
        await updateInTable(
          "UserConfig",
          { language: lang },
          { userId: userData?.uid },
        );
      }, true);
    },
    [changeLang, addTaskQueue, userData?.uid],
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
