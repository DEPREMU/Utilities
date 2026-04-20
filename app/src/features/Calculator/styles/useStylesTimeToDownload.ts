import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@/context/LayoutContext";

export const useStylesTimeToDownload = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        input: {
          marginBottom: 16,
          width: "100%",
          padding: getResponsiveValue(4, 8, 12),
        },
        resultContainer: {
          marginTop: 24,
          padding: 16,
          borderRadius: 8,
          backgroundColor: colors.accent,
        },
        resultLabel: {
          fontSize: getResponsiveValue(16, 18, 20),
          color: colors.primary,
          marginBottom: 8,
        },
        resultValue: {
          fontSize: getResponsiveValue(20, 22, 24),
          fontWeight: "bold",
          color: colors.text,
        },
        ...texts,
        ...getCommonStyles("divider"),
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
        ...getCommonStyles("sectionContainer"),
      }),
    [colors, getCommonStyles, getResponsiveValue, texts],
  );

  return { styles, colors };
};
