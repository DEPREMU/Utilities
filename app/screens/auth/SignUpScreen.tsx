import Animated, {
  withTiming,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useModal } from "@context/ModalContext";
import ButtonComponent from "@components/common/ButtonComponent";
import { useLanguage } from "@context/LanguageContext";
import { useNavigation } from "@react-navigation/native";
import { useUserContext } from "@context/UserContext";
import { Text, TextInput } from "react-native-paper";
import useStylesAuthScreens from "@styles/screens/auth/useStylesAuthScreens";
import { ActivityIndicator } from "react-native-paper";
import { RootStackParamList } from "navigation/AppNavigator";
import { View, Keyboard, Platform } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { log, isValidEmail, isValidPassword } from "@utils";
import React, { useCallback, useEffect, useRef, useState } from "react";

type SignUpScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SignUp"
>;

const SignUpScreen: React.FC = () => {
  const { t } = useLanguage();
  const { signUpRef } = useUserContext();
  const { styles } = useStylesAuthScreens();
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { openSnackBar } = useModal();

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [validations, setValidations] = useState<
    Record<"isEmailValid" | "isPasswordValid", boolean>
  >({
    isEmailValid: true,
    isPasswordValid: true,
  });

  const signingUpRef = useRef<boolean | null>(false);

  const handlePressSignUp = () => {
    if (signingUpRef.current) return;
    handlerBlurInputEmail();
    handlerBlurInputPassword();
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

  const shakeInputs = [useSharedValue(0), useSharedValue(0)];

  const animatedStyles = [
    useAnimatedStyle(() => {
      return {
        transform: [{ translateX: shakeInputs[0].value }],
      };
    }),
    useAnimatedStyle(() => {
      return {
        transform: [{ translateX: shakeInputs[1].value }],
      };
    }),
  ];

  const triggerShake = (which: "password" | "email") => {
    const valueToMove = 5;
    const duration = 50;
    const shakeInput = which === "email" ? shakeInputs[0] : shakeInputs[1];

    shakeInput.value = withSequence(
      withTiming(-valueToMove, { duration }),
      withTiming(valueToMove, { duration: duration * 2 }),
      withTiming(-valueToMove, { duration: duration * 2 }),
      withTiming(valueToMove, { duration: duration * 2 }),
      withTiming(0, { duration }),
    );
  };

  const handlerBlurInputEmail = () => {
    if (isValidEmail(email)) {
      setValidations((prev) => ({
        ...prev,
        isEmailValid: true,
      }));
      return;
    }

    setValidations((prev) => ({
      ...prev,
      isEmailValid: false,
    }));
    triggerShake("email");
  };

  const handlerBlurInputPassword = () => {
    if (isValidPassword(password)) {
      setValidations((prev) => ({
        ...prev,
        isPasswordValid: true,
      }));
      return;
    }

    setValidations((prev) => ({
      ...prev,
      isPasswordValid: false,
    }));
    triggerShake("password");
  };

  const handlePressShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handlePressLogin = useCallback(() => {
    navigation.replace("Login");
  }, [navigation]);

  const handlerOnFocus = useCallback(() => {
    if (Platform.OS !== "android") return;
    if (typeof Keyboard.emit === "function") Keyboard?.emit("keyboardDidShow");
  }, []);

  // Cleanup signingUpRef on unmount
  useEffect(
    () => () => {
      signingUpRef.current = null;
    },
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("welcome")}</Text>

        {/* Email space */}
        <Animated.View
          style={[
            styles.inputContainer,
            validations.isEmailValid ? null : animatedStyles[0],
            validations.isEmailValid ? null : styles.inputError,
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

        {/* Password space */}
        <Animated.View
          style={[
            styles.inputContainer,
            validations.isPasswordValid ? null : animatedStyles[1],
            validations.isPasswordValid ? null : styles.inputError,
          ]}
        >
          <TextInput
            style={styles.input}
            label={t("passwordPlaceholder")}
            underlineColor="#00a69d"
            activeUnderlineColor="#00a69d"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onFocus={handlerOnFocus}
            onBlur={handlerBlurInputPassword}
          />
          <ButtonComponent
            replaceStyles={{
              button: styles.showPasswordButton,
              textButton: {},
            }}
            forceReplaceStyles
            handlePress={handlePressShowPassword}
          />
        </Animated.View>

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
