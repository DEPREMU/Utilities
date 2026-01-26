import { View } from "react-native";
import LoginTypeQR from "@/components/auth/LoginTypeQR";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import ButtonComponent from "@components/common/ButtonComponent";
import EmailAndPassword from "@components/auth/EmailAndPassword";
import stylesLoginScreen from "@styles/screens/auth/useStylesAuthScreens";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { logger, tTyped, REPLACERS } from "@utils";
import { Text, ActivityIndicator, Switch } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

const LoginScreen: React.FC = () => {
  const { t } = useLanguage();
  const { openSnackBarRef } = useModal();
  const { dataRef, isLoggedIn } = useUserContext();
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
    navigateReplace("SignUp");
  });

  const handleForgotPasswordRef = useRef(() => {
    navigateReplace("forgotPassword");
  });

  const handleChangeTypeLoginRef = useRef(() => {
    setTypeLogin((prev) => (prev === "email" ? "qr" : "email"));
  });

  const handlePressLogin = useCallback(() => {
    if (loggingIn) return;
    setLoggingIn(true);

    dataRef.current.login(email, password, rememberMe, (success, error) => {
      if (!success) {
        setError(error || "Login failed");
        setLoggingIn(false);
        logger.error("AUTH", "Login failed:", error, email);
        return;
      }

      setLoggingIn(false);

      openSnackBarRef.current(tTyped("auth.successLoginMessage"), 3000, {
        label: tTyped("common.close"),
      });
    });
  }, [email, password, openSnackBarRef, dataRef, loggingIn, rememberMe]);

  useEffect(() => {
    if (isLoggedIn) navigateReplace("Home");
  }, [isLoggedIn]);

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
