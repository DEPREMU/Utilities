import {
  Icon,
  Text,
  Button,
  Dialog,
  Portal,
  Tooltip,
  IconButton,
} from "react-native-paper";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { useStylesHomeScreen } from "../styles/useStylesHomeScreen";
import { memoDeep, navigation } from "@utils";
import Animated, { LinearTransition } from "react-native-reanimated";
import React, { useCallback, useMemo, useState } from "react";
import { ScreensAvailable, AppTranslationsKeys, Function } from "@types";

export type ButtonType = {
  label: AppTranslationsKeys;
  screen: ScreensAvailable;
  keyWords: AppTranslationsKeys;
  description: AppTranslationsKeys;
  noNeedsSession?: boolean;
  noNeedsInternet?: boolean;
};

type RenderScreenProps = {
  button: ButtonType;
  hasInternet: boolean;
};

const RenderScreen: React.FC<RenderScreenProps> = ({ button, hasInternet }) => {
  const { t } = useLanguage();
  const { isLoggedIn } = useUserContext();
  const { styles, colors } = useStylesHomeScreen();

  const [showDialog, setShowDialog] = useState(false);

  const toggleShowDialog = useCallback(() => {
    setShowDialog((prev) => !prev);
  }, []);

  const handleNavigate = useCallback(() => {
    navigation.navigate(button.screen);
  }, [button.screen]);

  const isValidScreen = useMemo(
    () => button.screen === "Settings",
    [button.screen],
  );
  const internet = useMemo(
    () => button.noNeedsInternet || hasInternet,
    [button.noNeedsInternet, hasInternet],
  );
  const loggedIn = useMemo(
    () => button.noNeedsSession || isLoggedIn,
    [button.noNeedsSession, isLoggedIn],
  );

  const label = useMemo(
    () => (t as Function<[AppTranslationsKeys], string>)(button.label),
    [button.label, t],
  );

  const description = useMemo(
    () => (t as Function<[AppTranslationsKeys], string>)(button.description),
    [button.description, t],
  );

  return (
    <Animated.View
      style={styles.buttonContainer}
      layout={LinearTransition.duration(200).springify()}
    >
      <Portal>
        <Dialog visible={showDialog} onDismiss={toggleShowDialog}>
          <Dialog.Title>{label}</Dialog.Title>

          <Dialog.Content>
            <Animated.Text style={styles.h3}>{description}</Animated.Text>
          </Dialog.Content>

          <Dialog.Content>
            <Animated.Text style={styles.paragraph}>
              {button.noNeedsInternet
                ? t("homeScreen.noNeedsInternet", {
                    featureName: label,
                  })
                : t("homeScreen.needsInternet", {
                    featureName: label,
                  })}
            </Animated.Text>

            <Animated.Text style={styles.paragraph}>
              {button.noNeedsSession
                ? t("homeScreen.noNeedsSession", {
                    featureName: label,
                  })
                : t("homeScreen.needSession", {
                    featureName: label,
                  })}
            </Animated.Text>
          </Dialog.Content>

          <Dialog.Content>
            <Animated.Text style={styles.paragraph}>
              {t("homeScreen.keyWords", {
                keyWords: (t as Function<[AppTranslationsKeys], string>)(
                  button.keyWords,
                ),
              })}
            </Animated.Text>
          </Dialog.Content>
        </Dialog>
      </Portal>

      <Animated.View
        style={styles.leftIcon}
        layout={LinearTransition.duration(200).springify()}
      >
        <Tooltip
          title={
            (internet || isValidScreen) && loggedIn
              ? t("common.available")
              : !internet
                ? t("common.NoInternetConnection")
                : t("auth.youAreNotLoggedIn")
          }
          leaveTouchDelay={800}
          enterTouchDelay={300}
        >
          <Icon
            color={colors.background}
            source={
              (internet || isValidScreen) && loggedIn
                ? "check-circle"
                : "cancel"
            }
            size={25}
          />
        </Tooltip>
      </Animated.View>

      <Button
        mode="contained"
        onPress={handleNavigate}
        disabled={(!internet && !isValidScreen) || !loggedIn}
      >
        <Text style={styles.subtitle}>{label}</Text>
      </Button>

      <Animated.View
        layout={LinearTransition.duration(200).springify()}
        style={styles.rightIcon}
      >
        <Tooltip
          title={description}
          leaveTouchDelay={800}
          enterTouchDelay={300}
        >
          <IconButton
            size={25}
            icon={"help-circle-outline"}
            onPress={toggleShowDialog}
          />
        </Tooltip>
      </Animated.View>
    </Animated.View>
  );
};

export default memoDeep(RenderScreen);
