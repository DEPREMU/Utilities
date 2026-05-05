import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import {
  Text,
  Switch,
  Button,
  SegmentedButtons,
  ActivityIndicator,
} from "react-native-paper";
import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import Animated, {
  FadeInUp,
  FadeInRight,
  FadeOutDown,
  FadeOutLeft,
  LinearTransition,
} from "react-native-reanimated";
import {
  logger,
  tTyped,
  REPLACERS,
  navigation,
  sessionManager,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
  isValidEmail,
  isValidPassword,
} from "@utils";
import LoginTypeQR from "@screens/Auth/components/LoginTypeQR";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import EmailAndPassword from "@screens/Auth/components/EmailAndPassword";
import { useUserContext } from "@context/UserContext";
import { ScrollView, View } from "react-native";
import { useStylesAuthScreens } from "@screens/Auth/styles/useStylesAuthScreens";

const LoginScreen: React.FC = () => {
  const { t } = useLanguage();
  const { isLoggedIn } = useUserContext();
  const { styles, colors } = useStylesAuthScreens();

  const [email, setEmail] = useState<string>(
    REPLACERS.isDev ? "test@test.test" : "",
  );
  const [password, setPassword] = useState<string>(
    REPLACERS.isDev ? "Test123!" : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(REPLACERS.isWeb);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [typeLogin, setTypeLogin] = useState<"email" | "qr">(
    REPLACERS.isNative ? "email" : "qr",
  );

  const timeoutIdRef = useRef<number | null>(null);

  const handleShowPasswordRef = useRef(() => {
    setShowPassword((prev) => !prev);
  });

  const handlePressCreateAccountRef = useRef(() => {
    navigation.replace("SignUp");
  });

  const handleForgotPasswordRef = useRef(() => {
    navigation.replace("forgotPassword");
  });

  const handleChangeTypeLoginRef = useRef(() => {
    setTypeLogin((prev) => (prev === "email" ? "qr" : "email"));
    setPassword(REPLACERS.isDev ? "Test123!" : "");
  });

  const setErrorMessage = useRef((message: string) => {
    setError(message);
    clearTimeoutPolyfill(timeoutIdRef.current);
    timeoutIdRef.current = setTimeoutPolyfill(() => {
      setError(null);
      timeoutIdRef.current = null;
    }, 5000);
  });

  const handlePressLogin = useCallback(() => {
    if (loggingIn) return;
    setLoggingIn(true);

    sessionManager.login(email, password, rememberMe, (error) => {
      if (error) {
        setErrorMessage.current(error || "Login failed");
        setLoggingIn(false);
        logger.error("AUTH", "Login failed:", error, email);
        return;
      }

      setLoggingIn(false);

      modalRef.openSnackBar?.(tTyped("auth.successLoginMessage"), 3000, {
        label: tTyped("common.close"),
      });
    });
  }, [email, password, loggingIn, rememberMe]);

  const buttons = useMemo(() => {
    if (REPLACERS.isNative && !REPLACERS.isDev) return [];

    return [
      {
        value: "qr",
        label: t("qr.title"),
      },
      {
        value: "email",
        label: t("auth.email"),
      },
    ];
  }, [t]);

  useEffect(() => {
    if (isLoggedIn) navigation.replace("Home");
  }, [isLoggedIn]);

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
                {t("common.welcomeAgain")}
              </Animated.Text>

              {(REPLACERS.isWeb || REPLACERS.isDev) && (
                <Animated.View
                  style={styles.segmentedButtons}
                  layout={LinearTransition.duration(300).springify()}
                  exiting={FadeOutDown.duration(200)}
                  entering={FadeInUp.duration(200)}
                >
                  <SegmentedButtons
                    value={typeLogin}
                    style={styles.segmentedButtons}
                    buttons={buttons}
                    onValueChange={handleChangeTypeLoginRef.current}
                  />
                </Animated.View>
              )}

              <Animated.View style={styles.divider} />

              {typeLogin === "email" && (
                <EmailAndPassword
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  showPassword={showPassword}
                  handleShowPassword={handleShowPasswordRef.current}
                  showPasswordContainer
                />
              )}
              {typeLogin === "qr" && (REPLACERS.isWeb || REPLACERS.isDev) && (
                <LoginTypeQR rememberMe={rememberMe} />
              )}

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

              {typeLogin === "email" &&
                isValidEmail(email) &&
                isValidPassword(password) && (
                  <Animated.View
                    style={styles.loginButton}
                    layout={LinearTransition.duration(200).springify()}
                    exiting={FadeOutDown.duration(200)}
                    entering={FadeInUp.duration(200)}
                  >
                    <Button
                      mode="contained"
                      onPress={handlePressLogin}
                      disabled={loggingIn || typeLogin !== "email"}
                      elevation={4}
                      contentStyle={styles.loginButton}
                    >
                      {loggingIn ? (
                        <ActivityIndicator size="small" />
                      ) : (
                        <Text style={styles.h3}>{t("auth.loginButton")}</Text>
                      )}
                    </Button>
                  </Animated.View>
                )}

              <Animated.View
                style={styles.linksContainer}
                exiting={FadeOutDown.duration(200)}
                entering={FadeInUp.duration(200)}
              >
                <View style={styles.rememberMeContainer}>
                  <Text style={styles.subtitle}>{t("auth.rememberMe")}</Text>
                  <Switch
                    value={rememberMe}
                    color={colors.text}
                    trackColor={{ false: colors.primary, true: colors.text }}
                    thumbColor={!rememberMe ? colors.primary : colors.text}
                    onValueChange={setRememberMe}
                  />
                </View>

                <Button
                  mode="text"
                  onPress={handleForgotPasswordRef.current}
                  labelStyle={styles.linkText}
                >
                  {t("auth.forgotPassword")}
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

export default LoginScreen;
