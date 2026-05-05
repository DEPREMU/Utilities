import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesDownDetectorScreen = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        contentText: {
          lineHeight: getResponsiveValue(20, 22, 24, 26),
          color: colors.text,
          backgroundColor: colors.secondary + "30",
          padding: getResponsiveValue(8, 10, 12, 14),
          borderRadius: getResponsiveValue(6, 8, 10, 12),
          borderWidth: 1,
          borderColor: colors.border + "30",
          fontFamily: "monospace",
          maxHeight: getResponsiveValue(120, 140, 160, 180),
        },
        buttonContainer: {
          ...getCommonStyles("shadow"),
          padding: getResponsiveValue(12, 14, 16, 18),
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: getResponsiveValue(6, 8, 10, 12),
          marginTop: getResponsiveValue(8, 10, 12, 14),
          backgroundColor: colors.primary,
          minHeight: getResponsiveValue(40, 50, 60, 70),
        },
        buttonContainerSwitch: {
          ...getCommonStyles("shadow"),
          padding: getResponsiveValue(12, 14, 16, 18),
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: getResponsiveValue(6, 8, 10, 12),
          marginTop: getResponsiveValue(8, 10, 12, 14),
          backgroundColor: colors.primary,
          minHeight: getResponsiveValue(40, 50, 60, 70),
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        deleteFab: {
          ...getCommonStyles("FAB").FAB,
          top: 5,
          right: 5,
          bottom: undefined,
        },
        ...texts,
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
        ...getCommonStyles("rowSwitchText"),
        ...getCommonStyles("sectionContainer"),
      }),
    [getCommonStyles, getResponsiveValue, colors, texts],
  );

  return { styles, colors };
};
