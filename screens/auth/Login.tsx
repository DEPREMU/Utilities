import {
  checkLanguage,
  saveDataSecure,
} from "../../utils/globalVariables/utils";
import {
  loginEmail,
  loginUsername,
} from "../../utils/database/dataBaseConnection";
import {
  appName,
  userImage,
  ONBACKPRESS,
  LanguageKeys,
  TOKEN_KEY_STORAGE,
  USERNAME_KEY_STORAGE,
} from "../../utils/globalVariables/constants";
import {
  View,
  Text,
  Alert,
  Image,
  Platform,
  TextInput,
  Pressable,
  BackHandler,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import languages from "../../utils/languages/languages";
import { Checkbox } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { useStylesLogin } from "../../styles/auth/stylesLogIn";
import React, { useEffect, useState } from "react";

interface LoginProps {
  navigation: any;
}

const Login: React.FC<LoginProps> = ({ navigation }) => {
  const styles = useStylesLogin();
  const getTranslations = () => languages[lang];
  //? language, fonts, token and restaurantName

  const [lang, setLang] = useState<LanguageKeys>("en");
  const [password, setPassword] = useState<string>("");
  const [boolLogingin, setBoolLogingin] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [emailUserName, setEmailUserName] = useState<string>("");

  useEffect(() => {
    const loadLanguage = async () => setLang(await checkLanguage());

    loadLanguage();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        const translations = getTranslations();
        Alert.alert(translations.goBack, translations.askGoHomePage, [
          { text: translations.no, onPress: () => null },
          { text: translations.yes, onPress: () => navigation.replace("Home") },
        ]);
        return true;
      };

      BackHandler.addEventListener(ONBACKPRESS, onBackPress);
      return () => BackHandler.removeEventListener(ONBACKPRESS, onBackPress);
    }, [navigation])
  );

  useEffect(() => {
    if (!boolLogingin) return;

    const login = async () => {
      const translations = getTranslations();

      if (!emailUserName || !password) {
        Alert.alert(translations.error, translations.emptyFields);
        setBoolLogingin(false);
        return;
      }

      const username = emailUserName.includes("@") ? null : emailUserName;
      const email = emailUserName.includes("@") ? emailUserName : null;
      if (username) {
        const { data, error } = await loginUsername(
          username,
          password,
          translations
        );
        if (error) {
          Alert.alert(translations.error, translations.loginError);
          setBoolLogingin(false);
          return;
        }

        await saveDataSecure(TOKEN_KEY_STORAGE, data.token);
        await saveDataSecure(USERNAME_KEY_STORAGE, data.username);
      } else if (email) {
        const { data, error } = await loginEmail(email, password, translations);

        if (error) {
          Alert.alert(translations.error, translations.loginError);
          setBoolLogingin(false);
          return;
        }
        await saveDataSecure(TOKEN_KEY_STORAGE, data.token);
        await saveDataSecure(USERNAME_KEY_STORAGE, data.username);
      }
      navigation.replace("Home");
    };

    login();
  }, [boolLogingin]);

  const translations = getTranslations();

  return (
    <ScrollView
      style={styles.containerScrollView}
      contentContainerStyle={styles.contentContainerScrollView}
    >
      <Image source={userImage} style={styles.imageUser} />
      <View style={styles.formLogin}>
        <Text style={styles.title}>{appName}</Text>
        <View style={styles.containerFields}>
          <Text style={styles.text}>{translations.emailOrUsername}</Text>
          <TextInput
            style={styles.textInputUser}
            placeholder={translations.emailOrUsername}
            onChangeText={setEmailUserName}
            value={emailUserName}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.containerFields}>
          <Text style={styles.text}>{translations.password}</Text>
          <TextInput
            style={styles.textInputUser}
            placeholder={translations.password}
            onChangeText={setPassword}
            value={password}
            secureTextEntry={!showPassword}
          />
        </View>

        <View style={styles.containerNewAccount}>
          <Text style={styles.text}>{translations.haveAnAccount}</Text>
          <Pressable
            onPress={() => navigation.replace("Signin")}
            style={({ pressed }) => [
              styles.buttonLink,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Text style={styles.textLink}>{translations.signin}</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.buttonShowPassword}
          onPress={() => setShowPassword((prev) => !prev)}
        >
          <Checkbox status={showPassword ? "checked" : "unchecked"} />
          <Text style={styles.textShowPassword}>
            {translations.showPassword}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.buttonLogin,
            { opacity: pressed ? 0.5 : 1 },
          ]}
          onPress={() => setBoolLogingin(true)}
        >
          {!boolLogingin && (
            <Text style={styles.textButton}>{translations.login}</Text>
          )}
          {boolLogingin && <ActivityIndicator />}
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default Login;
