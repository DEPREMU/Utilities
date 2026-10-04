import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import {
  Text,
  Button,
  Divider,
  ActivityIndicator,
  TextInput as TextInputPaper,
} from "react-native-paper";
import Animated, {
  FadeInUp,
  FadeInRight,
  FadeOutDown,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import TextInput from "@components/TextInput";
import { Timers } from "@common";
import { Screens } from "@types";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { ScrollView, View } from "react-native";
import { useStylesAuthScreens } from "@screens/Auth/styles/useStylesAuthScreens";
import React, { useRef, useState, useEffect, useCallback } from "react";
import { navigation, Validations, resetForgotPassword, tTyped } from "@utils";

/**
 * Screen for setting a new account password using a validated reset token.
 */
const ResetPasswordScreen: React.FC<Screens["ResetPassword"]> = ({ route }) => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesAuthScreens();

  const email = route?.params?.email ?? "";
  const resetToken = route?.params?.resetToken ?? "";

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const timeoutIdRef = useRef<number | null>(null);

  const setErrorMessage = useCallback((message: string) => {
    setError(message);
    if (timeoutIdRef.current) Timers.clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = Timers.setTimeout(() => {
      setError(null);
      timeoutIdRef.current = null;
    }, 5000);
  }, []);

  useEffect(() => {
    if (!resetToken || !email) {
      navigation.replace("forgotPassword");
    }
    return () => {
      if (timeoutIdRef.current) Timers.clearTimeout(timeoutIdRef.current);
    };
  }, [email, resetToken]);

  const handleToggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleToggleShowConfirmPassword = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const handlePressLogin = useCallback(() => {
    navigation.replace("Login");
  }, []);

  const handlePressSubmit = useCallback(async () => {
    if (isSubmitting) return;

    if (!Validations.isValidPassword(password)) {
      setErrorMessage(t("auth.passwordRequirements"));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t("auth.passwordsDoNotMatch"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await resetForgotPassword(email, resetToken, password);
      setIsSubmitting(false);

      if ("error" in res && res.error) {
        const errMsg =
          typeof res.error === "string"
            ? res.error
            : "Failed to reset password";
        setErrorMessage(errMsg);
        return;
      }

      modalRef.openSnackBar?.(tTyped("auth.passwordResetSuccess"), 4000, {
        label: tTyped("common.close"),
      });

      navigation.replace("Login");
    } catch (err) {
      setIsSubmitting(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage(errMsg);
    }
  }, [
    t,
    email,
    password,
    resetToken,
    isSubmitting,
    confirmPassword,
    setErrorMessage,
  ]);

  const isFormValid =
    Validations.isValidPassword(password) &&
    password === confirmPassword &&
    confirmPassword.length > 0;

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
              <Text style={styles.title}>{t("auth.newPasswordTitle")}</Text>

              <Divider style={styles.divider} />

              {/* Password field */}
              <View style={styles.inputContainer}>
                <TextInput
                  value={password}
                  style={styles.input}
                  label={t("auth.newPasswordPlaceholder")}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  right={
                    <TextInputPaper.Icon
                      icon={showPassword ? "eye-off" : "eye"}
                      onPress={handleToggleShowPassword}
                    />
                  }
                />
              </View>

              {/* Confirm password field */}
              <View style={styles.inputContainer}>
                <TextInput
                  value={confirmPassword}
                  style={styles.input}
                  label={t("auth.confirmPasswordPlaceholder")}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  right={
                    <TextInputPaper.Icon
                      icon={showConfirmPassword ? "eye-off" : "eye"}
                      onPress={handleToggleShowConfirmPassword}
                    />
                  }
                />
              </View>

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

              {isFormValid && (
                <Animated.View
                  style={styles.loginButton}
                  layout={LinearTransition.duration(200).springify()}
                  exiting={FadeOutDown.duration(200)}
                  entering={FadeInUp.duration(200)}
                >
                  <Button
                    mode="contained"
                    onPress={handlePressSubmit}
                    disabled={isSubmitting}
                    elevation={4}
                    contentStyle={styles.loginButton}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={colors.text} />
                    ) : (
                      <Text style={styles.h3}>
                        {t("auth.resetPasswordButton")}
                      </Text>
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
                  onPress={handlePressLogin}
                  labelStyle={styles.linkText}
                >
                  {t("auth.hasAccount")}
                </Button>
              </Animated.View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
};

export default ResetPasswordScreen;
