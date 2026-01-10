import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import { useMemo } from "react";

const useStylesTimeToDownload = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          backgroundColor: colors.background,
        },
        title: {
          fontSize: getResponsiveValue(20, 22, 24),
          fontWeight: "bold",
          color: colors.primary,
        },
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
        section: {
          width: "100%",
        }, 
      }),
    [colors, getCommonStyles, getResponsiveValue],
  );

  return { styles, colors };
};

export default useStylesTimeToDownload;
