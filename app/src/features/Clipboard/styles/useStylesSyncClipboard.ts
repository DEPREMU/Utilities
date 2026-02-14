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
          padding: getResponsiveValue(20, 30, 40),
          backgroundColor: colors.background,
        },
        title: {
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
          textAlign: "center",
        },
        textInput: {
          ...getCommonStyles("shadow"),
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          padding: 15,
          fontSize: 16,
          minHeight: 100,
          height: "auto",
          maxHeight: 400,
          textAlignVertical: "top",
          color: colors.text,
          backgroundColor: colors.secondary,
          marginBottom: 20,
        },
        button: {
          backgroundColor: colors.primary,
          padding: 15,
          borderRadius: 8,
          alignItems: "center",
        },
        textButton: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "bold",
        },
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles };
};
