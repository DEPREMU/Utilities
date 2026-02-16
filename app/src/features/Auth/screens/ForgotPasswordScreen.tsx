import Animated, {
  withTiming,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useLanguage } from "@context/LanguageContext";
import ButtonComponent from "@/common/components/Button/screens";
import { useUserContext } from "@context/UserContext";
import { View, Keyboard } from "react-native";
import useStylesAuthScreens from "@screens/Auth/styles/useStylesAuthScreens";
import { modalRef, navigateReplace } from "@refs";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import { isValidEmail as isValidEmailFunc, logger, REPLACERS } from "@utils";

const ForgotPasswordScreen: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesAuthScreens();
  const { dataRef } = useUserContext();

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [isValidEmail, setIsValidEmail] = useState<boolean>(true);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const shakeInput = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeInput.value }],
    };
  });

  const handlePressForgotPassword = () => {
    if (emailSent) return;
    handlerBlurInputEmail();
    if (!isValidEmailFunc(email)) return;

    setEmailSent(true);
    setSendingEmail(true);

    dataRef.current.forgotPassword(email, (success, error) => {
      if (!success) {
        setError(error || "Sign up failed");
        setEmailSent(false);
        setSendingEmail(false);
        return logger.log("Sign up failed:", error, email);
      }

      setSendingEmail(false);
      setEmailSent(true);
      modalRef.openSnackBar?.(t("successForgotPasswordMessage"), 8000, {
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
    if (isValidEmailFunc(email)) {
      setIsValidEmail(true);
      return;
    }

    setIsValidEmail(false);
    triggerShake();
  };

  const handlePressLogin = useCallback(() => {
    navigateReplace("Login");
  }, []);

  const handlerOnFocus = useCallback(() => {
    if (REPLACERS.isWeb) return;
    if (typeof Keyboard.emit === "function") Keyboard?.emit("keyboardDidShow");
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("common.welcome")}</Text>

        {/* Email space */}
        <Animated.View
          style={[
            styles.inputContainer,
            isValidEmail ? null : animatedStyle,
            isValidEmail ? null : styles.inputError,
          ]}
        >
          <TextInput
            style={styles.input}
            label={t("auth.emailPlaceholder")}
            underlineColor="#00a69d"
            activeUnderlineColor="#00a69d"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            onFocus={handlerOnFocus}
            onBlur={handlerBlurInputEmail}
          />
        </Animated.View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <ButtonComponent
          label={sendingEmail ? t("common.sending") : t("auth.forgotPassword")}
          disabled={emailSent}
          touchableOpacity
          children={
            sendingEmail ? (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={styles.marginRight10}
              />
            ) : null
          }
          handlePress={handlePressForgotPassword}
          customStyles={{
            button: styles.loginButton,
            textButton: styles.buttonText,
          }}
        />

        <View style={styles.linksContainer}>
          <ButtonComponent
            label={t("auth.hasAccount")}
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

export default ForgotPasswordScreen;
