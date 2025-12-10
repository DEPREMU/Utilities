import { log } from "@utils";
import LoginTypeQR from "@/components/auth/LoginTypeQR";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import ButtonComponent from "@components/common/ButtonComponent";
import EmailAndPassword from "@components/auth/EmailAndPassword";
import stylesLoginScreen from "@styles/screens/auth/useStylesAuthScreens";
import { Platform, View } from "react-native";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import { Text, ActivityIndicator, Switch } from "react-native-paper";
import React, { useCallback, useEffect, useState } from "react";

const LoginScreen: React.FC = () => {
  const { t } = useLanguage();
  const { openSnackBar } = useModal();
  const { loginRef, isLoggedIn } = useUserContext();
  const { styles, text, primary } = stylesLoginScreen();

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [typeLogin, setTypeLogin] = useState<"email" | "qr">(
    Platform.OS !== "web" ? "email" : "qr",
  );

  const handlePressLogin = useCallback(() => {
    if (loggingIn) return;
    setLoggingIn(true);

    loginRef.current(email, password, rememberMe, (success, error) => {
      if (!success) {
        setError(error || "Login failed");
        setLoggingIn(false);
        return log("Login failed:", error, email);
      }

      setLoggingIn(false);

      openSnackBar(t("successLoginMessage"), 3000, { label: t("close") });
    });
  }, [email, password, openSnackBar, t, loginRef, loggingIn, rememberMe]);

  const handleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handlePressCreateAccount = useCallback(() => {
    navigateReplace("SignUp");
  }, []);

  const handleForgotPassword = useCallback(() => {
    navigateReplace("forgotPassword");
  }, []);

  useEffect(() => {
    if (isLoggedIn) navigateReplace("Home");
  }, [isLoggedIn]);

  const handleChangeTypeLogin = useCallback(() => {
    setTypeLogin((prev) => (prev === "email" ? "qr" : "email"));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("welcome")}</Text>

        {typeLogin === "email" && (
          <EmailAndPassword
            email={email}
            setEmail={setEmail}
            password={password}
            showPassword={showPassword}
            handleShowPassword={handleShowPassword}
            setPassword={setPassword}
          />
        )}
        {typeLogin === "qr" && (
          <LoginTypeQR
            rememberMe={rememberMe}
            handleChangeTypeLogin={handleChangeTypeLogin}
          />
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {typeLogin === "email" && (
          <ButtonComponent
            label={!loggingIn ? t("loginButton") : ""}
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
            <Text style={styles.rememberMeText}>{t("rememberMe")}</Text>
            <Switch
              color={text}
              trackColor={{ false: primary, true: text }}
              thumbColor={!rememberMe ? primary : text}
              value={rememberMe}
              onValueChange={setRememberMe}
            />
          </View>
          {Platform.OS === "web" && (
            <View style={styles.typeLoginContainer}>
              <Text style={styles.typeLoginText}>
                {t(typeLogin === "email" ? "loginWithEmail" : "loginWithQR")}
              </Text>
              <Switch
                color={text}
                trackColor={{ false: primary, true: text }}
                thumbColor={typeLogin === "email" ? primary : text}
                value={typeLogin === "qr"}
                onValueChange={handleChangeTypeLogin}
              />
            </View>
          )}

          <ButtonComponent
            label={t("forgotPassword")}
            touchableOpacity
            handlePress={handleForgotPassword}
            replaceStyles={{
              button: {},
              textButton: styles.linkText,
            }}
          />
          <ButtonComponent
            label={t("createAccount")}
            touchableOpacity
            handlePress={handlePressCreateAccount}
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
