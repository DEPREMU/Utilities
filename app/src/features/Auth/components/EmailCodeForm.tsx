import Animated, {
  FadeInUp,
  withTiming,
  FadeInRight,
  FadeOutDown,
  FadeOutLeft,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
  LinearTransition,
} from "react-native-reanimated";
import TextInput from "@components/TextInput";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { useStylesAuthScreens } from "@screens/Auth/styles/useStylesAuthScreens";
import { Text, Button, ActivityIndicator } from "react-native-paper";
import React, { useRef, useState, useCallback } from "react";
import { Validations, requestCode, tTyped, REPLACERS, Timers } from "@utils";

export type EmailCodeFormProps = {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  onSuccessRequest: (email: string) => void;
};

/**
 * Reusable email entry form for passwordless authentication.
 * Prompts the user for their email address and requests an 8-character verification code.
 */
export const EmailCodeForm: React.FC<EmailCodeFormProps> = ({
  email,
  setEmail,
  onSuccessRequest,
}) => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesAuthScreens();

  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailValid, setIsEmailValid] = useState<boolean>(true);

  const timeoutIdRef = useRef<number | null>(null);
  const shakeInputEmail = useSharedValue(0);

  const animatedStyleEmail = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeInputEmail.value }],
    };
  });

  const triggerShake = useCallback(() => {
    shakeInputEmail.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeInputEmail]);

  const setErrorMessage = useCallback((message: string) => {
    setError(message);
    if (timeoutIdRef.current) Timers.clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = Timers.setTimeout(() => {
      setError(null);
      timeoutIdRef.current = null;
    }, 5000);
  }, []);

  const handleRequestCode = useCallback(async () => {
    if (isRequesting) return;

    const normalizedEmail = email.trim();
    if (!Validations.isValidEmail(normalizedEmail)) {
      setIsEmailValid(false);
      triggerShake();
      setErrorMessage(t("auth.invalidEmailFormat"));
      return;
    }

    setIsEmailValid(true);
    setIsRequesting(true);
    setError(null);

    try {
      const res = await requestCode(normalizedEmail);
      if ("error" in res && res.error) {
        setErrorMessage(
          typeof res.error === "string" ? res.error : "Failed to send code",
        );
        setIsRequesting(false);
        return;
      }

      setIsRequesting(false);
      modalRef.openSnackBar?.(tTyped("auth.codeSent"), 3000, {
        label: tTyped("common.close"),
      });
      onSuccessRequest(normalizedEmail);
    } catch (err) {
      setIsRequesting(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      setErrorMessage(errMsg);
      REPLACERS.Logger.error("AUTH_CODE", "Error requesting code:", errMsg);
    }
  }, [email, isRequesting, onSuccessRequest, setErrorMessage, t, triggerShake]);

  return (
    <Animated.View
      style={styles.loginTypeContainer}
      layout={LinearTransition.duration(200).springify()}
    >
      <Text style={[styles.subtitle, styles.subtitleCenter]}>
        {t("auth.requestCodeDescription")}
      </Text>

      <Animated.View
        style={[styles.inputContainer, animatedStyleEmail]}
        layout={LinearTransition.duration(200).springify()}
      >
        <TextInput
          label={t("auth.emailPlaceholder")}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (!isEmailValid) setIsEmailValid(true);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          error={!isEmailValid}
          disabled={isRequesting}
          style={styles.input}
        />
      </Animated.View>

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
          onPress={handleRequestCode}
          disabled={isRequesting || !email}
          elevation={4}
          contentStyle={styles.loginButton}
        >
          {isRequesting ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Text style={styles.h3}>{t("auth.requestCode")}</Text>
          )}
        </Button>
      </Animated.View>
    </Animated.View>
  );
};

export default EmailCodeForm;
