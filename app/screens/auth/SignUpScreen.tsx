import { View } from "react-native";
import { Text } from "react-native-paper";
import { useModal } from "@context/ModalContext";
import ButtonComponent from "@components/common/ButtonComponent";
import { useLanguage } from "@context/LanguageContext";
import EmailAndPassword from "@components/auth/EmailAndPassword";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@/navigation/navigationRef";
import useStylesAuthScreens from "@styles/screens/auth/useStylesAuthScreens";
import { ActivityIndicator } from "react-native-paper";
import { log, isValidEmail, isValidPassword, clearRefs } from "@utils";
import React, { useCallback, useEffect, useRef, useState } from "react";

const SignUpScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesAuthScreens();
  const { openSnackBar } = useModal();
  const { signUpRef, isLoggedIn } = useUserContext();

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const signingUpRef = useRef<boolean | null>(false);

  const handlePressSignUp = () => {
    if (signingUpRef.current) return;
    if (!isValidEmail(email)) return;
    if (!isValidPassword(password)) return;

    signingUpRef.current = true;

    signUpRef.current(email, password, (success, error) => {
      if (!success) {
        setError(error || "Sign up failed");
        signingUpRef.current = false;
        return log("Sign up failed:", error, email);
      }

      signingUpRef.current = false;
      openSnackBar(`${t("successSignUpMessage")}\n${t("verifyEmail")}`, 8000, {
        label: t("close"),
      });
    });
  };

  const handlePressShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handlePressLogin = useCallback(() => {
    navigateReplace("Login");
  }, []);

  useEffect(() => {
    if (isLoggedIn) navigateReplace("Home");
  }, [isLoggedIn]);

  // Cleanup refs on unmount
  useEffect(() => () => clearRefs(signingUpRef), []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("welcome")}</Text>

        <EmailAndPassword
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          handleShowPassword={handlePressShowPassword}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <ButtonComponent
          label={!signingUpRef.current ? t("signUp") : ""}
          children={
            signingUpRef.current ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={styles.marginRight10}
              />
            ) : null
          }
          disabled={!!signingUpRef.current}
          touchableOpacity
          handlePress={handlePressSignUp}
          customStyles={{
            button: styles.loginButton,
            textButton: styles.buttonText,
          }}
        />

        <View style={styles.linksContainer}>
          <ButtonComponent
            label={t("hasAccount")}
            touchableOpacity
            handlePress={handlePressLogin}
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

export default SignUpScreen;
