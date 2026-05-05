import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import {
  logger,
  navigation,
  isValidEmail,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import Animated, {
  FadeInUp,
  withTiming,
  FadeOutDown,
  withSequence,
  useSharedValue,
  LinearTransition,
} from "react-native-reanimated";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { ScrollView, View } from "react-native";
import { useStylesAuthScreens } from "@screens/Auth/styles/useStylesAuthScreens";
import { Button, Divider, Text } from "react-native-paper";
import React, { useRef, useState } from "react";

import EmailAndPassword from "../components/EmailAndPassword";

const ForgotPasswordScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesAuthScreens();
  const { dataRef } = useUserContext();

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const shakeInput = useSharedValue(0);

  const timeoutIdRef = useRef<number | null>(null);

  const handlePressLoginRef = useRef(() => {
    navigation.replace("Login");
  });

  const handlePressCreateAccountRef = useRef(() => {
    navigation.replace("SignUp");
  });

  const handlePressForgotPassword = () => {
    if (emailSent) return;
    handlerBlurInputEmail();
    if (!isValidEmail(email)) return;

    setEmailSent(true);
    setSendingEmail(true);

    dataRef.current.forgotPassword(email, (success, error) => {
      if (!success) {
        setError(error || "Sign up failed");

        clearTimeoutPolyfill(timeoutIdRef.current);
        timeoutIdRef.current = setTimeoutPolyfill(() => {
          setError(null);
          timeoutIdRef.current = null;
        }, 4000);

        setEmailSent(false);
        setSendingEmail(false);
        return logger.log("Sign up failed:", error, email);
      }

      setSendingEmail(false);
      setEmailSent(true);
      modalRef.openSnackBar?.(t("auth.successForgotPasswordMessage"), 8000, {
        label: t("common.close"),
      });
    });
  };

  const triggerShake = () => {
    const valueToMove = 5;
    const duration = 50;

    shakeInput.value = withSequence(
      withTiming(-valueToMove, { duration }),
      withTiming(valueToMove, { duration: duration * 2 }),
      withTiming(-valueToMove, { duration: duration * 2 }),
      withTiming(valueToMove, { duration: duration * 2 }),
      withTiming(0, { duration }),
    );
  };

  const handlerBlurInputEmail = () => {
    if (isValidEmail(email)) return;

    triggerShake();
  };

  return (
    <KeyboardGestureArea style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          style={styles.scrollViewContainer}
          contentContainerStyle={styles.scrollViewContentContainer}
        >
          <View style={styles.contentContainer}>
            <Animated.View
              style={styles.content}
              layout={LinearTransition.duration(300).springify()}
            >
              <Text style={styles.title}>{t("auth.forgotPassword")}</Text>

              <Divider style={styles.divider} />

              <EmailAndPassword email={email} setEmail={setEmail} />

              {!!error && <Text style={styles.error}>{error}</Text>}

              {isValidEmail(email) && (
                <Animated.View
                  style={styles.linksContainer}
                  exiting={FadeOutDown.duration(200)}
                  entering={FadeInUp.duration(200)}
                >
                  <Button
                    mode="contained"
                    onPress={handlePressForgotPassword}
                    disabled={emailSent || sendingEmail}
                    contentStyle={styles.loginButton}
                  >
                    {sendingEmail
                      ? t("common.sending")
                      : t("auth.forgotPassword")}
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
                <Button
                  mode="text"
                  onPress={handlePressCreateAccountRef.current}
                  labelStyle={styles.linkText}
                >
                  {t("auth.createAccount")}
                </Button>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
};

export default ForgotPasswordScreen;
