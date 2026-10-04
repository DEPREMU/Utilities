import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import {
  tTyped,
  navigation,
  Validations,
  requestForgotPasswordCode,
} from "@utils";
import Animated, {
  FadeInUp,
  FadeInRight,
  FadeOutDown,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import { Timers } from "@common";
import { Screens } from "@types";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import EmailAndPassword from "../components/EmailAndPassword";
import { ScrollView, View } from "react-native";
import { useStylesAuthScreens } from "@screens/Auth/styles/useStylesAuthScreens";
import { Button, Divider, Text, ActivityIndicator } from "react-native-paper";
import React, { useRef, useState, useEffect, useCallback } from "react";

const RESEND_COOLDOWN_SECONDS = 60;

const ForgotPasswordScreen: React.FC<Screens["forgotPassword"]> = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesAuthScreens();

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const expiresAtRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<number | null>(null);

  const clearTimerInterval = useCallback(() => {
    if (timerIntervalRef.current) {
      Timers.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const setErrorMessage = useCallback((message: string) => {
    setError(message);
    if (timeoutIdRef.current) Timers.clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = Timers.setTimeout(() => {
      setError(null);
      timeoutIdRef.current = null;
    }, 5000);
  }, []);

  const startCooldownTimer = useCallback(() => {
    clearTimerInterval();
    expiresAtRef.current = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
    setCooldownRemaining(RESEND_COOLDOWN_SECONDS);

    timerIntervalRef.current = Timers.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((expiresAtRef.current - Date.now()) / 1000),
      );
      setCooldownRemaining(remaining);
      if (remaining <= 0) {
        clearTimerInterval();
      }
    }, 1000);
  }, [clearTimerInterval]);

  useEffect(() => {
    return () => {
      clearTimerInterval();
      if (timeoutIdRef.current) Timers.clearTimeout(timeoutIdRef.current);
    };
  }, [clearTimerInterval]);

  const handlePressLoginRef = useRef(() => {
    navigation.replace("Login");
  });

  const handlePressCreateAccountRef = useRef(() => {
    navigation.replace("SignUp");
  });

  const handlePressForgotPassword = useCallback(async () => {
    if (sendingEmail || cooldownRemaining > 0) return;
    if (!Validations.isValidEmail(email)) {
      setErrorMessage(t("auth.invalidEmailFormat"));
      return;
    }

    setSendingEmail(true);
    setError(null);

    try {
      const res = await requestForgotPasswordCode(email);
      setSendingEmail(false);

      if ("error" in res && res.error) {
        const errorMsg =
          typeof res.error === "string" ? res.error : "Failed to send code";
        setErrorMessage(errorMsg);
        return;
      }

      startCooldownTimer();
      modalRef.openSnackBar?.(
        tTyped("auth.successForgotPasswordMessage"),
        4000,
        {
          label: tTyped("common.close"),
        },
      );

      navigation.navigate("VerifyResetCode", { email });
    } catch (err) {
      setSendingEmail(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage(errMsg);
    }
  }, [
    cooldownRemaining,
    email,
    sendingEmail,
    setErrorMessage,
    startCooldownTimer,
    t,
  ]);

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
              <Text style={styles.title}>{t("auth.forgotPasswordTitle")}</Text>

              <Text style={[styles.subtitle, styles.verifyCodeSubtitle]}>
                {t("auth.forgotPasswordDescription")}
              </Text>

              <Divider style={styles.divider} />

              <EmailAndPassword email={email} setEmail={setEmail} />

              {!!error && (
                <Animated.Text
                  style={styles.error}
                  layout={LinearTransition.duration(200).springify()}
                  exiting={FadeOutLeft.duration(200)}
                  entering={FadeInRight.duration(300)}
                >
                  {error}
                </Animated.Text>
              )}

              {Validations.isValidEmail(email) && (
                <Animated.View
                  style={styles.loginButton}
                  layout={LinearTransition.duration(200).springify()}
                  exiting={FadeOutDown.duration(200)}
                  entering={FadeInUp.duration(200)}
                >
                  <Button
                    mode="contained"
                    onPress={handlePressForgotPassword}
                    disabled={sendingEmail || cooldownRemaining > 0}
                    elevation={4}
                    contentStyle={styles.loginButton}
                  >
                    {sendingEmail ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : cooldownRemaining > 0 ? (
                      <Text style={styles.h3}>
                        {t("auth.resendCodeIn", {
                          seconds: String(cooldownRemaining),
                        })}
                      </Text>
                    ) : (
                      <Text style={styles.h3}>{t("auth.sendResetCode")}</Text>
                    )}
                  </Button>
                </Animated.View>
              )}

              <Animated.View
                style={styles.linksContainer}
                exiting={FadeOutDown.duration(200)}
                entering={FadeInUp.duration(200)}
              >
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
              </Animated.View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
};

export default ForgotPasswordScreen;
