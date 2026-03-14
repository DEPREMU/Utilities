import { View } from "react-native";
import LoginTypeQR from "@screens/Auth/components/LoginTypeQR";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import ButtonComponent from "@/common/components/Button/screens";
import EmailAndPassword from "@screens/Auth/components/EmailAndPassword";
import stylesLoginScreen from "@screens/Auth/styles/useStylesAuthScreens";
import { useUserContext } from "@context/UserContext";
import { Text, ActivityIndicator, Switch } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { logger, tTyped, REPLACERS, sessionManager, navigation } from "@utils";

const LoginScreen: React.FC = () => {
  const { t } = useLanguage();
  const { isLoggedIn } = useUserContext();
  const { styles, text, primary } = stylesLoginScreen();

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [typeLogin, setTypeLogin] = useState<"email" | "qr">(
    REPLACERS.isNative ? "email" : "qr",
  );

  const handleShowPasswordRef = useRef(() => {
    setShowPassword((prev) => !prev);
  });

  const handlePressCreateAccountRef = useRef(() => {
    navigation.replace("SignUp");
  });

  const handleForgotPasswordRef = useRef(() => {
    navigation.replace("forgotPassword");
  });

  const handleChangeTypeLoginRef = useRef(() => {
    setTypeLogin((prev) => (prev === "email" ? "qr" : "email"));
  });

  const handlePressLogin = useCallback(() => {
    if (loggingIn) return;
    setLoggingIn(true);

    sessionManager.login(email, password, rememberMe, (error) => {
      if (error) {
        setError(error || "Login failed");
        setLoggingIn(false);
        logger.error("AUTH", "Login failed:", error, email);
        return;
      }

      setLoggingIn(false);

      modalRef.openSnackBar?.(tTyped("auth.successLoginMessage"), 3000, {
        label: tTyped("common.close"),
      });
    });
  }, [email, password, loggingIn, rememberMe]);

  useEffect(() => {
    if (isLoggedIn) navigation.replace("Home");
  }, [isLoggedIn]);

  useEffect(() => {
    const removeListener = sessionManager.addEventListener("login", (err) => {
      if (err) {
        logger.error("AUTH", "Login event error:", err);
        return;
      }
      navigation.replace("Home");
    });

    return () => removeListener();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("common.welcome")}</Text>

        {typeLogin === "email" && (
          <EmailAndPassword
            email={email}
            setEmail={setEmail}
            password={password}
            showPassword={showPassword}
            handleShowPassword={handleShowPasswordRef.current}
            setPassword={setPassword}
          />
        )}
        {REPLACERS.isWeb && typeLogin === "qr" && (
          <LoginTypeQR
            rememberMe={rememberMe}
            handleChangeTypeLogin={handleChangeTypeLoginRef.current}
          />
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {typeLogin === "email" && (
          <ButtonComponent
            label={!loggingIn ? t("auth.loginButton") : ""}
            touchableOpacity
            disabled={loggingIn}
            children={
              loggingIn ? (
                <ActivityIndicator
                  size="small"
                  color={text}
                  style={styles.loadingIndicator}
                />
              ) : null
            }
            handlePress={handlePressLogin}
            customStyles={{
              button: styles.loginButton,
              textButton: styles.buttonText,
            }}
          />
        )}

        <View style={styles.linksContainer}>
          <View style={styles.rememberMeContainer}>
            <Text style={styles.rememberMeText}>{t("auth.rememberMe")}</Text>
            <Switch
              color={text}
              trackColor={{ false: primary, true: text }}
              thumbColor={!rememberMe ? primary : text}
              value={rememberMe}
              onValueChange={setRememberMe}
            />
          </View>
          {REPLACERS.isWeb && (
            <View style={styles.typeLoginContainer}>
              <Text style={styles.typeLoginText}>
                {t(typeLogin === "email" ? "loginWithEmail" : "loginWithQR")}
              </Text>
              <Switch
                color={text}
                trackColor={{ false: primary, true: text }}
                thumbColor={typeLogin === "email" ? primary : text}
                value={typeLogin === "qr"}
                onValueChange={handleChangeTypeLoginRef.current}
              />
            </View>
          )}

          <ButtonComponent
            label={t("auth.forgotPassword")}
            touchableOpacity
            handlePress={handleForgotPasswordRef.current}
            replaceStyles={{
              button: {},
              textButton: styles.linkText,
            }}
          />
          <ButtonComponent
            label={t("auth.createAccount")}
            touchableOpacity
            handlePress={handlePressCreateAccountRef.current}
            replaceStyles={{
              button: {},
              textButton: styles.linkText,
            }}
            forceReplaceStyles
          />
        </View>
      </View>
    </View>
  );
};

export default LoginScreen;
