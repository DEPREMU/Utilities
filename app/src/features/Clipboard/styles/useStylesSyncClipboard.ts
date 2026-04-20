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
        ...getCommonStyles("sectionContainer"),
        container: {
          ...getCommonStyles("container").container,
          justifyContent: "center",
        },
        textInput: {
          fontSize: getResponsiveValue(16, 18, 20),
          minHeight: getResponsiveValue(120, 140, 180),
          maxHeight: getResponsiveValue(280, 360, 480),
          color: colors.text,
          marginBottom: getResponsiveValue(14, 18, 22),
          backgroundColor: colors.background,
          paddingHorizontal: getResponsiveValue(8, 10, 12),
          paddingVertical: getResponsiveValue(12, 14, 16),
        },
        button: {
          paddingVertical: getResponsiveValue(12, 14, 16),
          borderRadius: getResponsiveValue(8, 10, 12),
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
        },
        ...texts,
        ...getCommonStyles("flex"),
        ...getCommonStyles("divider"),
      }),
    [getCommonStyles, getResponsiveValue, colors, texts],
  );

  return { styles, colors };
};
