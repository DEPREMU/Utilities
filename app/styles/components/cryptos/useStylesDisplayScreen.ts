import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import useColors from "@hooks/useColors";

export const useStylesDisplayScreen = () => {
  const { background, text, primary, shadow, secondary, accent } = useColors();
  const { isTablet, isWeb, isLargeTablet } = useResponsiveLayout();

  const getResponsiveValue = <T = number>(
    phone: T,
    tablet: T,
    largeTablet: T,
    web: T,
  ) => {
    if (isWeb) return web;
    if (isLargeTablet) return largeTablet;
    if (isTablet) return tablet;
    return phone;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: background,
      paddingTop: getResponsiveValue(10, 15, 20, 25),
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: getResponsiveValue(20, 40, 60, 80),
      minHeight: isWeb ? 400 : 300,
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
      maxWidth: isWeb ? 600 : isTablet ? 400 : 300,
    },
    scrollView: {
      flex: 1,
    },
    contentScrollView: {
      padding: getResponsiveValue(16, 20, 24, 32),
      paddingBottom: getResponsiveValue(100, 110, 120, 140),
    },
    headerGradient: {
      height: getResponsiveValue(120, 130, 140, 160),
      justifyContent: "center",
      alignItems: "center",
      marginBottom: getResponsiveValue(20, 25, 30, 40),
      backgroundColor: secondary,
      borderBottomLeftRadius: getResponsiveValue(16, 18, 20, 24),
      borderBottomRightRadius: getResponsiveValue(16, 18, 20, 24),
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
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
      gap: getResponsiveValue(5, 14, 16, 20),
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
    },
    refreshIndicator: {
      position: "absolute",
      top: getResponsiveValue(10, 15, 20, 25),
      right: getResponsiveValue(10, 15, 20, 25),
      backgroundColor: primary,
      borderRadius: getResponsiveValue(16, 18, 20, 22),
      padding: getResponsiveValue(8, 10, 12, 14),
      borderWidth: 2,
      borderColor: secondary,
      zIndex: 10,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
    },
    refreshText: {
      color: text,
      fontSize: getResponsiveValue(12, 13, 14, 15),
      fontWeight: "700",
      letterSpacing: 0.3,
    },
  });

  return { styles };
};
