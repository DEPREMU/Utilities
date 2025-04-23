import {
  hashPassword,
  checkLanguage,
  loadDataSecure,
  removeDataSecure,
  interpolateMessage,
  generateToken,
  getLineError,
  getFileError,
} from "../../utils/globalVariables/utils";
import {
  appName,
  userImage,
  ONBACKPRESS,
  LanguageKeys,
  TOKEN_KEY_STORAGE,
  tableNameErrorLogs,
  tableNameUsers,
} from "../../utils/globalVariables/constants";
import {
  View,
  Text,
  Alert,
  Image,
  Platform,
  Pressable,
  TextInput,
  BackHandler,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Loading from "../../components/common/Loading";
import languages from "../../utils/languages/languages";
import { Checkbox } from "react-native-paper";
import ErrorComponent from "../../components/common/Error";
import { insertData } from "../../utils/database/dataBaseConnection";
import { stylesSignUp } from "../../styles/auth/stylesSignUp";
import { useFocusEffect } from "@react-navigation/native";
import React, { useEffect, useState } from "react";

interface SigninProps {
  navigation: any;
}

type State = "idle" | "loading" | "error";

const Signin: React.FC<SigninProps> = ({ navigation }) => {
  const thingsToLoad = 0;
  const styles = stylesSignUp();
  const getTranslations = () => languages[lang];

  const [lang, setLang] = useState<LanguageKeys>("en");
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [boolSigningin, setBoolSigningin] = useState<boolean>(false);
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [errorText, setErrorText] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [thingsLoaded, setThingsLoaded] = useState<number>(0);

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
    const loadLanguage = async () => {
      setLang(await checkLanguage());
    };

    loadLanguage();
  }, []);

  useEffect(() => {
    if (thingsLoaded >= thingsToLoad) setState("idle");
  }, [thingsLoaded]);

  const signIn = async () => {
    const translations = getTranslations();
    if (!email || !username || !password || !confirmPassword)
      return Alert.alert(translations.error, translations.emptyFields, [
        { text: translations.ok, onPress: () => setBoolSigningin(false) },
      ]);
    else if (password !== confirmPassword)
      return Alert.alert(translations.error, translations.passwordsNotMatch, [
        { text: translations.ok, onPress: () => setBoolSigningin(false) },
      ]);
    else if (password.length < 8)
      return Alert.alert(translations.error, translations.passwordLength, [
        { text: translations.ok, onPress: () => setBoolSigningin(false) },
      ]);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return Alert.alert(translations.error, translations.invalidEmail, [
        { text: translations.ok, onPress: () => setBoolSigningin(false) },
      ]);

    const passwordHashed = await hashPassword(password);
    const dataUser = {
      email: email.replaceAll(" ", ""),
      username: username.replaceAll(" ", ""),
      password: passwordHashed,
      registerTime: new Date().toISOString(),
      token: generateToken(),
      emailVerified: false,
    };

    const { success, error } = await insertData(tableNameUsers, dataUser);

    if (!success || error) {
      setErrorText(error ?? translations.error);
      await insertData(tableNameErrorLogs, {
        appName: appName,
        error: error || translations.error,
        date: new Date().toLocaleString(),
        component: `${getFileError() || "Signin"} | Line: ${
          getLineError() || "unknown"
        } => ${error}`,
      });
      setState("error");
      return;
    }
    Alert.alert(
      translations.success,
      interpolateMessage(translations.userCreated, [username]),
      [
        {
          text: translations.login,
          onPress: () => navigation.replace("Login"),
        },
        {
          text: translations.ok,
          onPress: () => {
            setConfirmPassword("");
            setEmail("");
            setPassword("");
            setUsername("");
            setBoolSigningin(false);
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!boolSigningin) return;
    const signin = async () => setTimeout(async () => await signIn(), 1000);
    signin();
  }, [boolSigningin]);

  if (state === "loading") return <Loading boolActivityIndicator />;

  if (state === "error")
    return <ErrorComponent errorText={errorText} navigation={navigation} />;

  const translations = getTranslations();

  if (state === "idle")
    return (
      <ScrollView
        style={styles.containerScrollView}
        contentContainerStyle={styles.contentContainerScrollView}
      >
        <Image source={userImage} style={styles.imageUser} />
        <View style={styles.formSignin}>
          <Text style={styles.title}>{appName}</Text>
          <View style={styles.containerFields}>
            <Text style={styles.text}>{translations.email}</Text>
            <TextInput
              style={styles.textInputUser}
              placeholder={translations.email}
              onChangeText={setEmail}
              value={email}
              keyboardType="email-address"
            />
          </View>
          <View style={styles.containerFields}>
            <Text style={styles.text}>{translations.username}</Text>
            <TextInput
              style={styles.textInputUser}
              placeholder={translations.username}
              onChangeText={setUsername}
              value={username}
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
          <View style={styles.containerFields}>
            <Text style={styles.text}>{translations.confirmPassword}</Text>
            <TextInput
              style={styles.textInputUser}
              placeholder={translations.confirmPassword}
              onChangeText={setConfirmPassword}
              value={confirmPassword}
              secureTextEntry={!showPassword}
            />
          </View>
          <View style={styles.containerHaveAnAccount}>
            <Text style={styles.text}>{translations.haveAnAccount}</Text>
            <Pressable
              onPress={() => navigation.replace("Login")}
              style={({ pressed }) => [
                styles.buttonLink,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <Text style={styles.textLink}>{translations.login}</Text>
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
              styles.buttonSignin,
              { opacity: pressed ? 0.5 : 1 },
            ]}
            onPress={() => setBoolSigningin(true)}
          >
            {!boolSigningin && (
              <Text style={styles.textButton}>{translations.signin}</Text>
            )}
            {boolSigningin && <ActivityIndicator />}
          </Pressable>
        </View>
      </ScrollView>
    );
};

export default Signin;
