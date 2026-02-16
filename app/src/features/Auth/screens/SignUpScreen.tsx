import {
  tTyped,
  logger,
  isValidEmail,
  sessionManager,
  isValidPassword,
} from "@utils";
import { View } from "react-native";
import { Text } from "react-native-paper";
import ButtonComponent from "@/common/components/Button/screens";
import { useLanguage } from "@context/LanguageContext";
import EmailAndPassword from "@screens/Auth/components/EmailAndPassword";
import { useUserContext } from "@/context/UserContext";
import useStylesAuthScreens from "@screens/Auth/styles/useStylesAuthScreens";
import { ActivityIndicator } from "react-native-paper";
import { modalRef, navigateReplace } from "@refs";
import React, { useCallback, useEffect, useRef, useState } from "react";

const SignUpScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesAuthScreens();
  const { isLoggedIn } = useUserContext();

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handlePressShowPasswordRef = useRef(() => {
    setShowPassword((prev) => !prev);
  });

  const handlePressLoginRef = useRef(() => {
    navigateReplace("Login");
  });

  const signingUpRef = useRef<boolean | null>(false);

  const handlePressSignUp = useCallback(() => {
    if (signingUpRef.current) return;
    if (!isValidEmail(email)) return;
    if (!isValidPassword(password)) return;

    signingUpRef.current = true;

    sessionManager.signUp(email, password, (success, error) => {
      if (!success) {
        setError(error || "Sign up failed");
        signingUpRef.current = false;
        return logger.log("Sign up failed:", error, email);
      }

      signingUpRef.current = false;
      modalRef.openSnackBar?.(
        `${tTyped("auth.successSignUpMessage")}\n${tTyped("auth.verifyEmail")}`,
        8000,
        {
          label: tTyped("common.close"),
        },
      );
    });
  }, [email, password]);

  useEffect(() => {
    if (isLoggedIn) navigateReplace("Home");
  }, [isLoggedIn]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("common.welcome")}</Text>

        <EmailAndPassword
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          showPassword={showPassword}
          handleShowPassword={handlePressShowPasswordRef.current}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <ButtonComponent
          label={!signingUpRef.current ? t("auth.signUp") : ""}
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
            label={t("auth.hasAccount")}
            touchableOpacity
            handlePress={handlePressLoginRef.current}
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
