import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import Animated, {
  FadeInUp,
  FadeOutDown,
  FadeInRight,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import {
  tTyped,
  logger,
  navigation,
  isValidEmail,
  sessionManager,
  isValidPassword,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import EmailAndPassword from "@screens/Auth/components/EmailAndPassword";
import { useUserContext } from "@/context/UserContext";
import { ScrollView, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { useStylesAuthScreens } from "@screens/Auth/styles/useStylesAuthScreens";
import { Button, Divider, Text } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

const SignUpScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesAuthScreens();
  const { isLoggedIn } = useUserContext();

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [signingUp, setSigningUp] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handlePressShowPasswordRef = useRef(() => {
    setShowPassword((prev) => !prev);
  });

  const handlePressLoginRef = useRef(() => {
    navigation.replace("Login");
  });

  const timeoutIdRef = useRef<number | null>(null);
  const signingUpRef = useRef<boolean | null>(false);

  const handlePressSignUp = useCallback(() => {
    if (signingUpRef.current) return;
    if (!isValidEmail(email)) return;
    if (!isValidPassword(password)) return;

    signingUpRef.current = true;
    setSigningUp(true);

    sessionManager.signUp(email, password, (success, error) => {
      if (!success) {
        setError(error || "Sign up failed");

        clearTimeoutPolyfill(timeoutIdRef.current);
        timeoutIdRef.current = setTimeoutPolyfill(() => {
          setError(null);
          timeoutIdRef.current = null;
        }, 3000);

        signingUpRef.current = false;
        setSigningUp(false);
        logger.log("Sign up failed:", error, email);
        return;
      }

      signingUpRef.current = false;
      setSigningUp(false);
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
    if (isLoggedIn) navigation.replace("Home");
  }, [isLoggedIn]);

  return (
    <KeyboardGestureArea style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          style={styles.scrollViewContainer}
          contentContainerStyle={styles.scrollViewContentContainer}
        >
          <Animated.View
            style={styles.content}
            layout={LinearTransition.duration(300).springify()}
          >
            <Text style={styles.title}>{t("common.welcome")}</Text>

            <Divider style={styles.divider} />

            <EmailAndPassword
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              showPassword={showPassword}
              handleShowPassword={handlePressShowPasswordRef.current}
              showPasswordContainer
            />

            {!!error && (
              <Animated.Text
                style={styles.error}
                layout={LinearTransition.duration(200).springify()}
                exiting={FadeOutLeft.duration(200)}
                entering={FadeInRight.duration(200)}
              >
                {error}
              </Animated.Text>
            )}

            {isValidEmail(email) && isValidPassword(password) && (
              <Animated.View
                style={styles.loginButton}
                layout={LinearTransition.duration(300).springify()}
                exiting={FadeOutDown.duration(200)}
                entering={FadeInUp.duration(200)}
              >
                <Button
                  mode="contained"
                  onPress={handlePressSignUp}
                  disabled={signingUp}
                  elevation={4}
                  contentStyle={styles.loginButton}
                >
                  {signingUp ? (
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                      style={styles.marginRight10}
                    />
                  ) : (
                    <Text style={styles.h3}>{t("auth.signUp")}</Text>
                  )}
                </Button>
              </Animated.View>
            )}

            <View style={styles.linksContainer}>
              <Button
                mode="text"
                onPress={handlePressLoginRef.current}
                labelStyle={styles.linkText}
              >
                {t("auth.hasAccount")}
              </Button>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
};

export default SignUpScreen;
