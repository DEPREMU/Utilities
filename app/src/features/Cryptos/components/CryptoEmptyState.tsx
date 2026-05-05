import Animated, {
  withRepeat,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Text } from "react-native-paper";
import { memoDeep } from "@utils";
import { useLanguage } from "@context/LanguageContext";
import React, { useEffect } from "react";
import { useStylesDisplayScreen } from "../styles/useStylesDisplayScreen";

const EmptyState: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesDisplayScreen();

  const yValue = useSharedValue(0);
  const yValueIcon = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    gap: 10,
    transform: [{ translateY: yValue.value }],
    alignItems: "center",
  }));
  const animatedStyleIcon = useAnimatedStyle(() => ({
    transform: [{ translateY: yValueIcon.value }],
  }));

  useEffect(() => {
    yValue.value = withRepeat(withSpring(-10, { stiffness: 100 }), -1, true);
    yValueIcon.value = withRepeat(
      withSpring(-10, { stiffness: 100, damping: 10 }),
      -1,
      true,
    );
  }, [yValue, yValueIcon]);

  return (
    <Animated.View style={[styles.sectionContainer, animatedStyle]}>
      <Animated.Text style={[styles.emptyStateIcon, animatedStyleIcon]}>
        {t("cryptos.icon")}
      </Animated.Text>

      <Text style={styles.title}>
        {t("cryptos.noCryptocurrenciesSelected")}
      </Text>

      <Text style={styles.subtitle}>{t("cryptos.goToSelectionTab")}</Text>
    </Animated.View>
  );
};

export default memoDeep(EmptyState);
