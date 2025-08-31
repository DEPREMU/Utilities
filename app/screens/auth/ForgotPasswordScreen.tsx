import Animated, {
  withTiming,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { log } from "@utils";
import { useModal } from "@context/ModalContext";
import ButtonComponent from "@components/common/ButtonComponent";
import { useLanguage } from "@context/LanguageContext";
import { useNavigation } from "@react-navigation/native";
import { useUserContext } from "@context/UserContext";
import { ActivityIndicator, Text, TextInput } from "react-native-paper";
import useStylesAuthScreens from "@styles/screens/auth/useStylesAuthScreens";
import { RootStackParamList } from "navigation/AppNavigator";
import { View, Keyboard, Platform } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import { isValidEmail as isValidEmailFunc } from "@utils";

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "forgotPassword"
>;

const ForgotPasswordScreen: React.FC = () => {
  const { t } = useLanguage();
  const { forgotPassword } = useUserContext();
  const { styles } = useStylesAuthScreens();
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { openSnackBar } = useModal();

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

    forgotPassword(email, (success, error) => {
      if (!success) {
        setError(error || "Sign up failed");
        setEmailSent(false);
        setSendingEmail(false);
        return log("Sign up failed:", error, email);
      }

      setSendingEmail(false);
      setEmailSent(true);
      openSnackBar(t("successForgotPasswordMessage"), 8000, {
        label: t("close"),
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
    navigation.replace("Login");
  }, [navigation]);

  const handlerOnFocus = useCallback(() => {
    if (Platform.OS !== "android") return;
    if (typeof Keyboard.emit === "function") Keyboard?.emit("keyboardDidShow");
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("welcome")}</Text>

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
            label={t("emailPlaceholder")}
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
          label={sendingEmail ? t("sending") : t("forgotPassword")}
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

export default ForgotPasswordScreen;
