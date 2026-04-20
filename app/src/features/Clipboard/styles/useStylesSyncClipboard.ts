import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesSyncClipboard = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        textInput: {
          color: colors.text,
          fontSize: getResponsiveValue(16, 18, 20),
          minHeight: getResponsiveValue(120, 140, 180),
          maxHeight: getResponsiveValue(280, 360, 480),
          marginBottom: getResponsiveValue(14, 18, 22),
          backgroundColor: colors.background,
          paddingVertical: getResponsiveValue(12, 14, 16),
          paddingHorizontal: getResponsiveValue(8, 10, 12),
        },
        FABContainer: {
          width: "100%",
          marginBottom: getResponsiveValue(14, 18, 22),
          alignItems: "flex-end",
        },
        ...texts,
        ...getCommonStyles("flex"),
        ...getCommonStyles("divider"),
        ...getCommonStyles("scrollView"),
        ...getCommonStyles("sectionContainer"),
      }),
    [getCommonStyles, getResponsiveValue, colors, texts],
  );

  return { styles, colors };
};
