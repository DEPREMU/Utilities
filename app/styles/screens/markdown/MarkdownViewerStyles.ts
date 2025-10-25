import { useResponsiveLayout } from "@/context/LayoutContext";
import { useTheme } from "@/context/ThemeContext";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

export const useStylesMarkdownViewer = () => {
  const { colors } = useTheme();
  const { getResponsiveValue, getCommonStyles } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          backgroundColor: colors.background,
        },
        title: {
          fontSize: 24,
          fontWeight: "bold",
          color: colors.text,
          marginBottom: 16,
        },
        scrollView: {
          flex: 1,
          width: "100%",
          padding: 8,
        },
        input: {
          ...getCommonStyles("shadow"),
          maxHeight: getResponsiveValue(150, 200, 250, 300),
          padding: 4,
          width: "100%",
          borderColor: "#ccc",
          borderWidth: 1,
          borderRadius: 8,
          marginBottom: 16,
          textAlignVertical: "top",
        },
        contentStyle: {
          fontSize: 16,
        },
      }),
    [colors, getCommonStyles, getResponsiveValue],
  );

  return { styles };
};
