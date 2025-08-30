import { useTheme } from "@context/ThemeContext";
import { DimensionValue, StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import { useMemo } from "react";

export const useStylesMinesweeper = () => {
  const useColors = useTheme();
  const {
    isPhone,
    isTablet,
    isLargeTablet,
    width,
    getCommonStyles,
    getResponsiveValue,
  } = useResponsiveLayout();
  const { colors } = useColors;

  const typography = useMemo(
    () => ({
      titleSize: isPhone ? 28 : isTablet ? 32 : isLargeTablet ? 36 : 40,
      infoSize: isPhone ? 14 : isTablet ? 16 : isLargeTablet ? 18 : 20,
      cellSize: isPhone ? 12 : isTablet ? 16 : isLargeTablet ? 18 : 20,
      buttonSize: isPhone ? 14 : isTablet ? 16 : isLargeTablet ? 18 : 20,
    }),
    [isPhone, isTablet, isLargeTablet],
  );

  const spacing = useMemo(
    () => ({
      xs: isPhone ? 4 : 6,
      sm: isPhone ? 8 : 12,
      md: isPhone ? 16 : 20,
      lg: isPhone ? 24 : 30,
      xl: isPhone ? 32 : 40,
    }),
    [isPhone],
  );

  const borderRadius = useMemo(
    () => ({
      sm: isPhone ? 4 : 6,
      md: isPhone ? 8 : 12,
      lg: isPhone ? 12 : 16,
    }),
    [isPhone],
  );

  const cellSize = useMemo(
    () =>
      isPhone
        ? Math.min(width / 10, 35)
        : isTablet
          ? Math.min(width / 15, 45)
          : Math.min(width / 20, 55),
    [isPhone, isTablet, width],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "flex-start",
          padding: spacing.md,
        },
        contentContainer: {
          flex: 1,
          width: "100%",
          maxWidth: getResponsiveValue<DimensionValue>("100%", "90%", 800),
          alignItems: "center",
          justifyContent: "flex-start",
        },
        title: {
          fontSize: typography.titleSize,
          fontWeight: "800",
          color: colors.text,
          textAlign: "center",
          marginBottom: spacing.md,
          letterSpacing: 1,
          textShadowColor: colors.shadow + "30",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        },
        difficultyContainer: {
          flexDirection: "row",
          justifyContent: "space-around",
          marginVertical: spacing.lg,
          gap: spacing.sm,
          width: "100%",
          maxWidth: 400,
        },
        difficultySelected: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.accent,
          borderRadius: borderRadius.md,
          borderWidth: 2,
          borderColor: colors.primary,
        },
        infoContainer: {
          ...getCommonStyles("shadow"),
          alignItems: "center",
          marginVertical: spacing.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.secondary,
          borderRadius: borderRadius.lg,
          borderWidth: 1,
          borderColor: colors.primary,
          minWidth: 250,
        },
        infoText: {
          fontSize: typography.infoSize,
          color: colors.text,
          textAlign: "center",
          fontWeight: "600",
          marginVertical: spacing.xs,
          letterSpacing: 0.3,
        },
        containerMinesweeper: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.secondary,
          borderRadius: borderRadius.lg,
          padding: spacing.xs,
          borderWidth: 2,
          borderColor: colors.primary,
          alignSelf: "center",
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
        },
        cell: {
          width: cellSize,
          height: cellSize,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          minWidth: 30,
          minHeight: 30,
        },
        cellHidden: {
          ...getCommonStyles("shadow"),
          width: cellSize,
          height: cellSize,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.secondary,
          borderWidth: 1,
          borderColor: colors.border,
          minWidth: 30,
          minHeight: 30,
        },
        cellText: {
          fontSize: typography.cellSize,
          color: colors.text,
          fontWeight: "700",
          textAlign: "center",
        },
        cellMine: {
          backgroundColor: colors.error,
        },
        cellFlag: {
          backgroundColor: colors.accent,
        },
        cellNumber1: { color: colors.info },
        cellNumber2: { color: colors.success },
        cellNumber3: { color: colors.error },
        cellNumber4: { color: colors.warning },
        cellNumber5: { color: colors.error },
        cellNumber6: { color: colors.info },
        cellNumber7: { color: colors.text },
        cellNumber8: { color: colors.shadow },
      }),
    [
      colors,
      spacing,
      cellSize,
      typography,
      borderRadius,
      getCommonStyles,
      getResponsiveValue,
    ],
  );

  return {
    styles,
    typography,
    spacing,
    borderRadius,
    cellSize,
    ...colors,
  };
};
