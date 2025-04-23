import {
  saveData,
  getAllNotifications,
} from "../../utils/globalVariables/utils";
import {
  dictNotifications,
  dictKeyNotifications,
} from "../../utils/globalVariables/interfaces";
import {
  typeNotis,
  LanguageKeys,
  ALL_NOTIFICATIONS,
} from "../../utils/globalVariables/constants";
import Loading from "../common/Loading";
import languages from "../../utils/languages/languages";
import { Switch, Text } from "react-native-paper";
import { ScrollView, View } from "react-native";
import useStylesNotifications from "../../styles/settings/stylesNotifications";
import { TranslationsInterface } from "../../utils/globalVariables/TranslationsInterface";
import React, { useEffect, useState } from "react";

interface NotificationSettingsProps {
  navigation: any;
  translations?: TranslationsInterface;
  lang?: LanguageKeys;
  token?: string | null;
}

type State = "loading" | "error" | "idle";

const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  navigation,
  translations,
  lang = "en",
  token,
}) => {
  const styles = useStylesNotifications();
  const thingsToLoad = 1;

  const [state, setState] = useState<State>("loading");
  const [thingsLoaded, setThingsLoaded] = useState<number>(0);
  const [allNotifications, setAllNotifications] =
    useState<dictNotifications | null>(null);

  const handleNotification = async (key: typeNotis) => {
    setAllNotifications((prev) => {
      if (!prev) return null;

      const newNotifications = { ...prev };
      newNotifications[key].isActive = !newNotifications[key].isActive;

      return newNotifications;
    });
  };

  useEffect(() => {
    const getNotifications = async () => {
      const notifications = await getAllNotifications();
      setThingsLoaded((prev) => prev + 1);
      setAllNotifications(notifications);
    };

    getNotifications();
  }, []);

  useEffect(() => {
    if (!allNotifications) return;

    const saveNotifications = async () =>
      await saveData(ALL_NOTIFICATIONS, JSON.stringify(allNotifications));

    saveNotifications();
  }, [allNotifications]);

  useEffect(() => {
    if (thingsLoaded >= thingsToLoad) setState("idle");
  }, [thingsLoaded]);

  if (!translations) translations = languages[lang];

  if (state === "loading") return <Loading boolActivityIndicator />;
  if (state === "error")
    return <Text style={styles.error}>{translations.error}</Text>;

  if (state === "idle")
    return (
      <ScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.scrollViewContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerText}>
          {translations.notificationsScreen}
        </Text>
        {allNotifications &&
          Object.entries(allNotifications).map(
            ([key, dictKeyNotifications]: [string, dictKeyNotifications]) => (
              <View style={styles.containerEachNotification} key={key}>
                <Text style={styles.textEachNotification}>
                  {
                    translations[
                      `notifications${
                        key as typeNotis
                      }` as keyof TranslationsInterface
                    ]
                  }
                </Text>
                <Switch
                  value={dictKeyNotifications.isActive}
                  onValueChange={() => handleNotification(key as typeNotis)}
                />
              </View>
            )
          )}
      </ScrollView>
    );
};

export default NotificationSettings;
