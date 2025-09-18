import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesIP_API = () => {
  const { colors } = useTheme();
  const { height, getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const typography = useMemo(
    () => ({
      titleSize: getResponsiveValue(28, 32, 36, 40),
      keySize: getResponsiveValue(16, 18, 20, 22),
      valueSize: getResponsiveValue(15, 17, 19, 21),
    }),
    [getResponsiveValue],
  );

  const spacing = useMemo(
    () => ({
      xs: getResponsiveValue(4, 6, 8, 10),
      sm: getResponsiveValue(8, 12, 16, 20),
      md: getResponsiveValue(12, 16, 20, 24),
      lg: getResponsiveValue(16, 20, 24, 28),
      xl: getResponsiveValue(32, 40, 48, 56),
    }),
    [getResponsiveValue],
  );

  const borderRadius = useMemo(
    () => ({
      sm: getResponsiveValue(6, 8, 10, 12),
      md: getResponsiveValue(8, 12, 16, 20),
      lg: getResponsiveValue(12, 16, 20, 24),
      xl: getResponsiveValue(16, 20, 24, 28),
    }),
    [getResponsiveValue],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          padding: spacing.md,
          width: "100%",
          backgroundColor: colors.background,
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
          backgroundColor: colors.secondary,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          width: "100%",
          borderColor: colors.primary,
          maxWidth: 500,
          elevation: 3,
        },
        containerDataIP: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.primary,
          width: "100%",
          maxWidth: 500,
        },
        containerEachValue: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.sm,
          paddingVertical: spacing.xs,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.primary + "30",
        },
        textIP: {
          fontSize: typography.titleSize,
          fontWeight: "800",
          width: "100%",
          textAlign: "center",
          marginBottom: spacing.lg,
          minHeight: typography.titleSize + 8,
          color: colors.primary,
          letterSpacing: 1,
          textShadowColor: colors.shadow + "20",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        },
        textKey: {
          fontSize: typography.keySize,
          fontWeight: "600",
          color: colors.text,
          letterSpacing: 0.5,
          flexShrink: 0,
          marginRight: spacing.sm,
          textTransform: "capitalize",
        },
        value: {
          fontSize: typography.valueSize,
          color: colors.accent,
          fontWeight: "500",
          textAlign: "right",
          letterSpacing: 0.3,
        },
        skeletonValue: {
          width: 140,
          height: 20,
          borderRadius: borderRadius.sm,
          backgroundColor: colors.secondary,
          overflow: "hidden",
        },
        mapContainer: {
          ...getCommonStyles("shadow"),
          height: getResponsiveValue(200, 250, 300, 350),
          marginTop: spacing.lg,
          borderWidth: 2,
          borderColor: colors.primary,
          borderRadius: borderRadius.lg,
          overflow: "hidden",
          width: "100%",
          maxWidth: 500,
        },
        map: {
          ...StyleSheet.absoluteFillObject,
        },
      }),
    [
      colors,
      spacing,
      borderRadius,
      typography,
      getCommonStyles,
      height,
      getResponsiveValue,
    ],
  );

  return { styles };
};

export default useStylesIP_API;
