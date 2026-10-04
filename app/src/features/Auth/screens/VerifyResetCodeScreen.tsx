import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import {
  tTyped,
  Timers,
  navigation,
  verifyForgotPasswordCode,
  requestForgotPasswordCode,
} from "@utils";
import Animated, {
  FadeInUp,
  FadeInRight,
  FadeOutDown,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import { Screens } from "@types";
import { modalRef } from "@refs";
import { OtpInput } from "@screens/Auth/components/OtpInput";
import { useLanguage } from "@context/LanguageContext";
import { View, ScrollView } from "react-native";
import { useStylesAuthScreens } from "@screens/Auth/styles/useStylesAuthScreens";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import React, { useRef, useState, useEffect, useCallback } from "react";

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Screen for entering and verifying the 8-character password reset code.
 */
const VerifyResetCodeScreen: React.FC<Screens["VerifyResetCode"]> = ({
  route,
}) => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesAuthScreens();

  const email = route?.params?.email ?? "";
  const [code, setCode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(
    RESEND_COOLDOWN_SECONDS,
  );

  const expiresAtRef = useRef<number>(
    Date.now() + RESEND_COOLDOWN_SECONDS * 1000,
  );
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
    startCooldownTimer();
    return () => {
      clearTimerInterval();
      if (timeoutIdRef.current) Timers.clearTimeout(timeoutIdRef.current);
    };
  }, [clearTimerInterval, startCooldownTimer]);

  const handleVerify = useCallback(
    async (codeToVerify?: string) => {
      const submitCode = codeToVerify ?? code;
      if (isVerifying || submitCode.length !== 8) return;

      setIsVerifying(true);
      setError(null);

      try {
        const res = await verifyForgotPasswordCode(email, submitCode);
        setIsVerifying(false);

        if ("error" in res && res.error) {
          const errMsg =
            typeof res.error === "string" ? res.error : "Verification failed";
          setErrorMessage(errMsg);
          setCode("");
          return;
        }

        if ("resetToken" in res && res.resetToken) {
          navigation.replace("ResetPassword", {
            email,
            resetToken: res.resetToken,
          });
        }
      } catch (err) {
        setIsVerifying(false);
        const errMsg = err instanceof Error ? err.message : String(err);
        setErrorMessage(errMsg);
        setCode("");
      }
    },
    [code, email, isVerifying, setErrorMessage],
  );

  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      if (error) setError(null);
      if (newCode.length === 8 && !isVerifying) {
        handleVerify(newCode);
      }
    },
    [error, handleVerify, isVerifying],
  );

  const handleResendCode = useCallback(async () => {
    if (cooldownRemaining > 0 || isResending || !email) return;

    setIsResending(true);
    setError(null);

    try {
      const res = await requestForgotPasswordCode(email);
      setIsResending(false);

      if ("error" in res && res.error) {
        setErrorMessage(
          typeof res.error === "string" ? res.error : "Failed to send code",
        );
        return;
      }

      setCode("");
      startCooldownTimer();
      modalRef.openSnackBar?.(tTyped("auth.codeSent"), 3000, {
        label: tTyped("common.close"),
      });
    } catch (err) {
      setIsResending(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage(errMsg);
    }
  }, [
    email,
    isResending,
    setErrorMessage,
    cooldownRemaining,
    startCooldownTimer,
  ]);

  const handleEditEmail = useCallback(() => {
    navigation.replace("forgotPassword");
  }, []);

  return (
    <KeyboardGestureArea style={styles.flex} interpolator="ios">
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
              <Animated.Text
                style={styles.title}
                layout={LinearTransition.duration(200).springify()}
              >
                {t("auth.verifyResetCodeTitle")}
              </Animated.Text>

              <Animated.Text
                style={[styles.subtitle, styles.verifyCodeSubtitle]}
                layout={LinearTransition.duration(200).springify()}
              >
                {t("auth.verifyResetCodeDescription", { email })}
              </Animated.Text>

              <Animated.View style={styles.divider} />

              <OtpInput
                code={code}
                onChangeCode={handleCodeChange}
                length={8}
                disabled={isVerifying}
                hasError={!!error}
              />

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

              <Animated.View
                style={styles.loginButton}
                layout={LinearTransition.duration(200).springify()}
                exiting={FadeOutDown.duration(200)}
                entering={FadeInUp.duration(200)}
              >
                <Button
                  mode="contained"
                  onPress={() => handleVerify()}
                  disabled={isVerifying || code.length !== 8}
                  elevation={4}
                  contentStyle={styles.loginButton}
                >
                  {isVerifying ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Text style={styles.h3}>{t("auth.verifyCode")}</Text>
                  )}
                </Button>
              </Animated.View>

              <Animated.View
                style={styles.linksContainer}
                exiting={FadeOutDown.duration(200)}
                entering={FadeInUp.duration(200)}
              >
                <Button
                  mode="text"
                  onPress={handleResendCode}
                  disabled={cooldownRemaining > 0 || isResending}
                  labelStyle={styles.linkText}
                >
                  {cooldownRemaining > 0
                    ? t("auth.resendCodeIn", {
                        seconds: String(cooldownRemaining),
                      })
                    : t("auth.resendCode")}
                </Button>

                <Button
                  mode="text"
                  onPress={handleEditEmail}
                  labelStyle={styles.linkText}
                >
                  {t("auth.changeEmail")}
                </Button>
              </Animated.View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
};

export default VerifyResetCodeScreen;
