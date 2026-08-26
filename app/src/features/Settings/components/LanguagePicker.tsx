import {
  memoDeep,
  navigation,
  ServerFetch,
  languagesNames,
  sessionManager,
  storageManagement,
} from "@utils";
import { List } from "react-native-paper";
import { REPLACERS } from "@common";
import { background } from "@/utils/services/background";
import { useLanguage } from "@context/LanguageContext";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { LanguagesSupported } from "@types";
import React, { useMemo, useRef } from "react";

const LanguagePicker: React.FC = () => {
  const { colors } = useAppBehavior();
  const { changeLanguageRef: changeLanguage, t, language } = useLanguage();

  const changeLanguageRef = useRef(async (lang: LanguagesSupported) => {
    const { sessionToken, userData } = sessionManager.getSessionData();

    if (sessionToken && userData?.userId)
      background.addTaskQueue(
        {
          arguments: [],
          function: async () => {
            if (!sessionToken) return navigation.replace("Login");
            const deviceId = storageManagement.get("DEVICE_ID");

            try {
              await ServerFetch.put(
                "/user-config/update",
                {
                  body: { values: { language: lang }, deviceId },
                },
                sessionToken,
              );
            } catch (error) {
              REPLACERS.Logger.error("Error updating user config:", error);
            }
          },
        },
        true,
      );
    await changeLanguage.current(lang);
  });

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
          onPress={() => changeLanguageRef.current(key as LanguagesSupported)}
        />
      )),
    [language, colors],
  );

  return (
    <>
      <List.Accordion
        title={t("settings.setLanguage")}
        left={(props) => <List.Icon {...props} icon="translate" />}
      >
        {itemsRendered}
      </List.Accordion>
    </>
  );
};

export default memoDeep(LanguagePicker);
