import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesIPQuery = () => {
  const colors = useTheme();
  const { isPhone, isTablet, isLargeTablet, height, getCommonStyles } =
    useResponsiveLayout();
  const { background, text, primary, secondary, shadow, accent } = colors;

  const typography = {
    titleSize: isPhone ? 28 : isTablet ? 32 : isLargeTablet ? 36 : 40,
    keySize: isPhone ? 16 : isTablet ? 18 : isLargeTablet ? 20 : 22,
    valueSize: isPhone ? 15 : isTablet ? 17 : isLargeTablet ? 19 : 21,
    ipSize: isPhone ? 17 : isTablet ? 19 : isLargeTablet ? 21 : 23,
  };

  const spacing = {
    xs: isPhone ? 4 : 6,
    sm: isPhone ? 8 : 12,
    md: isPhone ? 16 : 20,
    lg: isPhone ? 24 : 30,
    xl: isPhone ? 32 : 40,
  };

  const borderRadius = {
    sm: isPhone ? 8 : 10,
    md: isPhone ? 12 : 16,
    lg: isPhone ? 16 : 20,
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: spacing.md,
      backgroundColor: background,
      width: "100%",
      alignItems: "center",
      minHeight: height - 130,
    },
    containerIP: {
      ...getCommonStyles("shadow"),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: secondary,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: primary,
      width: "100%",
      maxWidth: 500,
    },
    containerDataIP: {
      ...getCommonStyles("shadow"),
      backgroundColor: secondary,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginTop: spacing.sm,
      width: "100%",
      maxWidth: 500,
      borderWidth: 1,
      borderColor: primary,
    },
    containerEachValue: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
      paddingVertical: spacing.xs,
      borderBottomWidth: 0.5,
      borderBottomColor: primary + "30",
      width: "100%",
    },
    textIP: {
      fontSize: typography.titleSize,
      fontWeight: "800",
      textAlign: "center",
      color: primary,
      marginBottom: spacing.lg,
      minHeight: typography.titleSize + 8,
      letterSpacing: 1,
      textShadowColor: shadow + "20",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    textKey: {
      fontSize: typography.keySize,
      fontWeight: "600",
      color: text,
      letterSpacing: 0.5,
      flexShrink: 0,
      marginRight: spacing.sm,
      textTransform: "capitalize",
    },
    value: {
      fontSize: typography.valueSize,
      color: accent,
      fontWeight: "500",
      textAlign: "right",
      flex: 1,
      letterSpacing: 0.3,
    },
    valueIP: {
      fontSize: typography.ipSize,
      fontWeight: "700",
      color: accent,
      letterSpacing: 0.5,
    },
    skeletonValue: {
      borderRadius: borderRadius.sm,
      width: 140,
      height: 20,
      overflow: "hidden",
    },
    mapContainer: {
      height: isPhone ? 200 : isTablet ? 250 : isLargeTablet ? 300 : 350,
      marginTop: spacing.lg,
      borderWidth: 2,
      borderColor: primary,
      borderRadius: borderRadius.lg,
      overflow: "hidden",
      width: "100%",
      maxWidth: 500,
      ...getCommonStyles("shadow"),
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
  });

  return {
    styles,
    typography,
    spacing,
    borderRadius,
    shimmerColors: [secondary, background, secondary],
    ...colors,
  };
};

export default useStylesIPQuery;
