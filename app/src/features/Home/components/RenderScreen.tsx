import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { Button, List, Text } from "react-native-paper";
import { useStylesHomeScreen } from "../styles/useStylesHomeScreen";
import { memoDeep, navigation } from "@utils";
import Animated, { LinearTransition } from "react-native-reanimated";
import React, { useCallback, useMemo } from "react";
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

  return (
    <Animated.View
      style={styles.buttonContainer}
      layout={LinearTransition.duration(200).springify()}
    >
      <List.Icon
        style={styles.leftIcon}
        color={colors.background}
        icon={
          (internet || isValidScreen) && loggedIn ? "check-circle" : "cancel"
        }
      />

      <Button
        mode="contained"
        onPress={handleNavigate}
        disabled={(!internet && !isValidScreen) || !loggedIn}
      >
        <Text style={styles.subtitle}>
          {(t as Function<[AppTranslationsKeys], string>)(button.label)}
        </Text>
      </Button>

      <List.Icon
        style={styles.rightIcon}
        color={colors.background}
        icon={
          (internet || isValidScreen) && loggedIn ? "check-circle" : "cancel"
        }
      />
    </Animated.View>
  );
};

export default memoDeep(RenderScreen);
