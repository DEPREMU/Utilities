import Animated, {
  withTiming,
  withSequence,
  useSharedValue,
  useAnimatedStyle,
  FadeOutDown,
  FadeInUp,
  LinearTransition,
} from "react-native-reanimated";
import TextInput from "@components/TextInput";
import { useLanguage } from "@context/LanguageContext";
import { useStylesAuthScreens } from "@screens/Auth/styles/useStylesAuthScreens";
import React, { useRef, useState } from "react";
import { TextInput as TextInputPaper } from "react-native-paper";
import { isValidEmail, isValidPassword } from "@utils";

type LoginTypeEmail = <T extends boolean>(
  props: LoginTypeEmailProps<T>,
) => React.ReactNode;

type LoginTypeEmailProps<T extends boolean> = {
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  showPasswordContainer?: T;
} & (T extends true
  ? {
      password?: string;
      setPassword?: React.Dispatch<React.SetStateAction<string>>;
      showPassword?: boolean;
      handleShowPassword?: () => void;
    }
  : unknown);

const EmailAndPassword: LoginTypeEmail = (props) => {
  const {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    handleShowPassword,
    showPasswordContainer,
  } = props as LoginTypeEmailProps<true>;

  const { t } = useLanguage();
  const { styles } = useStylesAuthScreens();

  const [validations, setValidations] = useState<
    Record<"isEmailValid" | "isPasswordValid", boolean>
  >({
    isEmailValid: true,
    isPasswordValid: true,
  });

  const shakeInputEmail = useSharedValue(0);
  const shakeInputPassword = useSharedValue(0);

  const animatedStyleEmail = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeInputEmail.value }],
    };
  });

  const animatedStylePassword = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeInputPassword.value }],
    };
  });

  const refs = useRef({
    password,
    email,
  });
  refs.current.email = email;
  refs.current.password = password;

  const triggerShakeRef = useRef((which: "password" | "email") => {
    const valueToMove = 5;
    const duration = 50;
    const shakeInput = which === "email" ? shakeInputEmail : shakeInputPassword;

    shakeInput.value = withSequence(
      withTiming(-valueToMove, { duration }),
      withTiming(valueToMove, { duration: duration * 2 }),
      withTiming(-valueToMove, { duration: duration * 2 }),
      withTiming(valueToMove, { duration: duration * 2 }),
      withTiming(0, { duration }),
    );
  });

  const handlerBlurInputEmailRef = useRef(() => {
    const isEmailValid = isValidEmail(refs.current.email || "");

    setValidations((prev) => ({
      ...prev,
      isEmailValid,
    }));

    if (!isEmailValid) triggerShakeRef.current("email");
  });

  const handlerBlurInputPasswordRef = useRef(() => {
    const isPasswordValid = isValidPassword(refs.current.password || "");

    setValidations((prev) => ({
      ...prev,
      isPasswordValid,
    }));

    if (!isPasswordValid) triggerShakeRef.current("password");
  });

  return (
    <Animated.View
      style={styles.loginTypeContainer}
      layout={LinearTransition.duration(300).springify()}
      exiting={FadeOutDown.duration(200)}
      entering={FadeInUp.duration(200)}
    >
      {/* Email space */}
      <Animated.View
        style={[
          styles.inputContainer,
          animatedStyleEmail,
          validations.isEmailValid ? null : styles.inputError,
        ]}
      >
        <TextInput
          value={email}
          style={styles.input}
          label={t("auth.emailPlaceholder")}
          onBlur={handlerBlurInputEmailRef.current}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Animated.View>

      {/* Password space */}
      {showPasswordContainer && (
        <Animated.View
          style={[
            styles.inputContainer,
            animatedStylePassword,
            validations.isPasswordValid ? null : styles.inputError,
          ]}
        >
          <TextInput
            value={password}
            style={styles.input}
            label={t("auth.passwordPlaceholder")}
            onBlur={handlerBlurInputPasswordRef.current}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            right={
              <TextInputPaper.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={handleShowPassword}
              />
            }
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

export default EmailAndPassword;
