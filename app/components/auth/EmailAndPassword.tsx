import React, { useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { TextInput } from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import ButtonComponent from "@components/common/ButtonComponent";
import useStylesAuthScreens from "@styles/screens/auth/useStylesAuthScreens";
import { Keyboard, Platform } from "react-native";
import { isValidEmail, isValidPassword } from "@utils";

interface LoginTypeEmailProps {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  showPassword: boolean;
  handleShowPassword: () => void;
}

const EmailAndPassword: React.FC<LoginTypeEmailProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  handleShowPassword,
}) => {
  const { t } = useLanguage();
  const { styles, text, secondary } = useStylesAuthScreens();

  const [validations, setValidations] = useState<
    Record<"isEmailValid" | "isPasswordValid", boolean>
  >({
    isEmailValid: true,
    isPasswordValid: true,
  });

  const shakeInputs = [useSharedValue(0), useSharedValue(0)];

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

  return (
    <>
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
          placeholderTextColor={text}
          underlineColor={secondary}
          activeUnderlineColor={secondary}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          onFocus={() => {
            if (Platform.OS !== "android") return;
            if (typeof Keyboard.emit === "function")
              Keyboard?.emit("keyboardDidShow");
          }}
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
          underlineColor={secondary}
          activeUnderlineColor={secondary}
          placeholderTextColor={text}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          onFocus={() => {
            if (Platform.OS !== "android") return;
            if (typeof Keyboard.emit === "function")
              Keyboard?.emit("keyboardDidShow");
          }}
          onBlur={handlerBlurInputPassword}
        />
        <ButtonComponent
          replaceStyles={{
            button: styles.showPasswordButton,
            textButton: {},
          }}
          forceReplaceStyles
          handlePress={handleShowPassword}
        />
      </Animated.View>
    </>
  );
};

export default EmailAndPassword;
