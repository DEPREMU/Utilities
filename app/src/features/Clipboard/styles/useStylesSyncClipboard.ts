import { useResponsiveLayout } from "@/context/LayoutContext";
import { useTheme } from "@/context/ThemeContext";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

export const useStylesSyncClipboard = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          width: "100%",
          maxWidth: 900,
          alignSelf: "center",
          paddingHorizontal: getResponsiveValue(12, 18, 24),
          paddingTop: getResponsiveValue(10, 14, 18),
          backgroundColor: colors.background,
        },
        formCard: {
          ...getCommonStyles("shadow"),
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: getResponsiveValue(12, 14, 16),
          backgroundColor: colors.secondary,
          padding: getResponsiveValue(14, 18, 22),
        },
        title: {
          fontSize: getResponsiveValue(28, 30, 34),
          fontWeight: "bold",
          color: colors.text,
          marginBottom: getResponsiveValue(14, 18, 22),
          textAlign: "center",
        },
        textInput: {
          fontSize: getResponsiveValue(16, 18, 20),
          minHeight: getResponsiveValue(120, 140, 180),
          maxHeight: getResponsiveValue(280, 360, 480),
          color: colors.text,
          marginBottom: getResponsiveValue(14, 18, 22),
          backgroundColor: colors.background,
        },
        button: {
          backgroundColor: colors.primary,
          paddingVertical: getResponsiveValue(12, 14, 16),
          borderRadius: getResponsiveValue(10, 12, 14),
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
        },
        textButton: {
          color: colors.text,
          fontSize: getResponsiveValue(18, 20, 22),
          fontWeight: "bold",
        },
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles, colors };
};
