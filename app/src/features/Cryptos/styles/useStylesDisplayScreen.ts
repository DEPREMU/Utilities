import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesDisplayScreen = () => {
  const { colors } = useAppBehavior();
  const { getResponsiveValue, getCommonStyles, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        padding0: { padding: 0 },
        emptyStateIcon: {
          color: colors.accent,
          fontSize: getResponsiveValue(64, 72, 80, 96),
          marginBottom: getResponsiveValue(20, 24, 28, 32),
          textShadowColor: colors.shadow,
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4,
        },
        contentScrollView: {
          padding: getResponsiveValue(16, 20, 24, 32),
          paddingBottom: getResponsiveValue(100, 110, 120, 140),
          width: "100%",
        },
        headerGradient: {
          ...getCommonStyles("shadow").shadow,
          ...getCommonStyles("container").container,
          flex: undefined,
          paddingTop: 10,
          marginBottom: getResponsiveValue(20, 25, 30, 40),
          backgroundColor: colors.secondary,
          borderBottomLeftRadius: getResponsiveValue(16, 18, 20, 24),
          borderBottomRightRadius: getResponsiveValue(16, 18, 20, 24),
          borderWidth: 2,
          borderColor: colors.primary,
        },
        cryptoGrid: {
          ...getCommonStyles("container").container,
          ...getCommonStyles("shadow").shadow,
          gap: getResponsiveValue(10, 14, 16, 20),
          flexDirection: "row",
          flexWrap: "wrap",
        },
        ...texts,
        ...getCommonStyles("FAB"),
        ...getCommonStyles("flex"),
        ...getCommonStyles("container"),
        ...getCommonStyles("sectionContainer"),
      }),
    [colors, getCommonStyles, getResponsiveValue, texts],
  );

  return { styles, colors };
};
