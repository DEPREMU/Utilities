import Animated, {
  withRepeat,
  withSpring,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { memoDeep } from "@utils";
import { StyleSheet } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { Text, Button, Icon } from "react-native-paper";
import { useCryptoStore } from "../services/cryptoZustand";
import React, { useEffect } from "react";
import { useStylesDisplayScreen } from "../styles/useStylesDisplayScreen";

const localStyles = StyleSheet.create({
  subtitleOverrides: { textAlign: "center", paddingHorizontal: 20 },
  buttonOverrides: { marginTop: 15 },
});

const ServiceUnavailable: React.FC = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesDisplayScreen();

  const refreshing = useCryptoStore((state) => state.refreshing);
  const refreshPrices = useCryptoStore((state) => state.refreshPrices);

  const yValue = useSharedValue(0);
  const yValueIcon = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    gap: 15,
    transform: [{ translateY: yValue.value }],
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  }));

  const animatedStyleIcon = useAnimatedStyle(() => ({
    transform: [{ translateY: yValueIcon.value }],
  }));

  useEffect(() => {
    yValue.value = withRepeat(withSpring(-5, { stiffness: 100 }), -1, true);
    yValueIcon.value = withRepeat(
      withSpring(-5, { stiffness: 100, damping: 10 }),
      -1,
      true,
    );
  }, [yValue, yValueIcon]);

  return (
    <Animated.View style={animatedStyle}>
      <Animated.View style={animatedStyleIcon}>
        <Icon source="alert" size={80} />
      </Animated.View>

      <Text style={styles.title} variant="titleLarge">
        {t("common.notAvailable")}
      </Text>

      <Text style={[styles.subtitle, localStyles.subtitleOverrides]}>
        {t("common.serviceUnavailable")}
      </Text>

      <Button
        mode="contained"
        onPress={refreshPrices}
        loading={refreshing}
        disabled={refreshing}
        style={[localStyles.buttonOverrides, { backgroundColor: colors.error }]}
      >
        {t("labels.retry")}
      </Button>
    </Animated.View>
  );
};

export default memoDeep(ServiceUnavailable);
