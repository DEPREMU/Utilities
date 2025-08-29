import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import { useCallback, useMemo } from "react";

export const useStylesDisplayScreen = () => {
  const { background, text, primary, shadow, secondary, accent } = useTheme();
  const { isTablet, isWeb, isLargeTablet, getCommonStyles } =
    useResponsiveLayout();

  const getResponsiveValue = useCallback(
    <T = number>(phone: T, tablet: T, largeTablet: T, web: T) => {
      if (isWeb) return web;
      if (isLargeTablet) return largeTablet;
      if (isTablet) return tablet;
      return phone;
    },
    [isWeb, isLargeTablet, isTablet],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          backgroundColor: background,
        },
        emptyStateContainer: {
          ...getCommonStyles("shadow"),
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: getResponsiveValue(20, 24, 28, 32),
          backgroundColor: secondary,
          borderRadius: getResponsiveValue(16, 18, 20, 24),
          borderWidth: 2,
          borderColor: primary,
        },
        padding0: {
          padding: 0,
        },
        emptyStateIcon: {
          fontSize: getResponsiveValue(64, 72, 80, 96),
          color: accent,
          marginBottom: getResponsiveValue(20, 24, 28, 32),
          textShadowColor: shadow,
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4,
        },
        emptyStateTitle: {
          fontSize: getResponsiveValue(22, 24, 26, 30),
          color: text,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: getResponsiveValue(12, 14, 16, 20),
        },
        emptyStateSubtitle: {
          fontSize: getResponsiveValue(16, 17, 18, 20),
          color: text,
          textAlign: "center",
          lineHeight: getResponsiveValue(22, 24, 26, 28),
          maxWidth: getResponsiveValue(undefined, undefined, 600, 800),
        },
        scrollView: {
          flex: 1,
          width: "100%",
        },
        contentScrollView: {
          padding: getResponsiveValue(16, 20, 24, 32),
          paddingBottom: getResponsiveValue(100, 110, 120, 140),
          width: "100%",
        },
        headerGradient: {
          ...getCommonStyles(["shadow", "mainContainer"]),
          flex: undefined,
          paddingTop: 10,
          marginBottom: getResponsiveValue(20, 25, 30, 40),
          backgroundColor: secondary,
          borderBottomLeftRadius: getResponsiveValue(16, 18, 20, 24),
          borderBottomRightRadius: getResponsiveValue(16, 18, 20, 24),
          borderWidth: 2,
          borderColor: primary,
        },
        headerTitle: {
          fontSize: getResponsiveValue(28, 30, 34, 40),
          color: text,
          fontWeight: "800",
          textAlign: "center",
          textShadowColor: shadow,
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4,
          letterSpacing: 0.5,
        },
        headerSubtitle: {
          fontSize: getResponsiveValue(14, 15, 16, 18),
          color: accent,
          textAlign: "center",
          marginTop: getResponsiveValue(8, 9, 10, 12),
          fontWeight: "600",
          opacity: 0.9,
        },
        cryptoGrid: {
          ...getCommonStyles(["mainContainer", "shadow"], {
            copyInsets: false,
          }),
          gap: getResponsiveValue(10, 14, 16, 20),
          flexDirection: "row",
          flexWrap: "wrap",
        },
        refreshIndicator: {
          ...getCommonStyles("shadow"),
          position: "absolute",
          top: getResponsiveValue(0, 5, 10, 15),
          right: getResponsiveValue(10, 15, 20, 25),
          backgroundColor: primary,
          borderRadius: getResponsiveValue(16, 18, 20, 22),
          padding: getResponsiveValue(8, 10, 12, 14),
          borderWidth: 2,
          borderColor: secondary,
          zIndex: 10,
        },
        refreshText: {
          color: text,
          fontSize: getResponsiveValue(12, 13, 14, 15),
          fontWeight: "700",
          letterSpacing: 0.3,
        },
      }),
    [
      text,
      accent,
      shadow,
      primary,
      secondary,
      background,
      getCommonStyles,
      getResponsiveValue,
    ],
  );

  return { styles };
};
