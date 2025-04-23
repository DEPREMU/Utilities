import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  SafeAreaView,
  ScrollView,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import useStylesSettings from "../styles/stylesSettings";
import NotificationSettings from "../components/Settings/NotificationSettings";
import {
  LanguageKeys,
  ONBACKPRESS,
  TOKEN_KEY_STORAGE,
} from "../utils/globalVariables/constants";
import languages from "../utils/languages/languages";
import { checkLanguage, loadDataSecure } from "../utils/globalVariables/utils";
import { useFocusEffect } from "@react-navigation/native";
import Loading from "../components/common/Loading";
import Theme from "../components/Settings/Theme";

interface SettingsProps {
  navigation: any;
}

const Settings: React.FC<SettingsProps> = ({ navigation }) => {
  const styles = useStylesSettings();
  const thingsToLoad = 1;
  const getTranslations = () => languages[lang];

  const [lang, setLang] = useState<LanguageKeys>("en");
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "idle">("loading");
  const [thingsLoaded, setThingsLoaded] = useState<number>(0);

  useEffect(() => {
    const loadLanguage = async () => setLang(await checkLanguage());
    const loadToken = async () => {
      setToken(await loadDataSecure(TOKEN_KEY_STORAGE));
      setThingsLoaded((prev) => prev + 1);
    };
    loadLanguage();
    loadToken();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        const translations = getTranslations();
        Alert.alert(translations.goBack, translations.askGoHomePage, [
          { text: translations.no, onPress: () => null },
          {
            text: translations.yes,
            onPress: () => navigation.replace("Home"),
          },
        ]);
        return true;
      };

      BackHandler.addEventListener(ONBACKPRESS, onBackPress);
      return () => BackHandler.removeEventListener(ONBACKPRESS, onBackPress);
    }, [navigation])
  );

  useEffect(() => {
    if (thingsLoaded >= thingsToLoad) setState("idle");
  }, [thingsLoaded]);

  const translations = getTranslations();

  if (state === "loading") return <Loading boolActivityIndicator />;

  if (state === "idle")
    return (
      <SafeAreaView style={styles.containerSafeAreaView}>
        <Text style={styles.headerText}>{translations.settings}</Text>
        <ScrollView
          style={styles.scrollViewContainer}
          contentContainerStyle={styles.scrollViewContentContainer}
          showsVerticalScrollIndicator={false}
        >
          <NotificationSettings
            navigation={navigation}
            translations={translations}
            lang={lang}
            token={token}
          />
          <Theme translations={translations} />
          <View style={styles.separator} />
        </ScrollView>
      </SafeAreaView>
    );
};

export default Settings;
