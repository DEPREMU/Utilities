import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesSettingsClipboard = () => {
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          maxWidth: 1000,
          gap: getResponsiveValue(10, 12, 14, 16),
          width: "100%",
          paddingHorizontal: getResponsiveValue(10, 14, 18),
          paddingTop: getResponsiveValue(8, 10, 12),
          alignSelf: "center",
          justifyContent: "flex-start",
        },
        title: {
          fontSize: getResponsiveValue(22, 24, 28),
          color: colors.text,
          textAlign: "center",
          fontWeight: "700",
          marginBottom: getResponsiveValue(2, 4, 6),
        },
        section: {
          ...getCommonStyles("shadow"),
          width: "100%",
          padding: getResponsiveValue(12, 14, 16),
          borderRadius: getResponsiveValue(10, 12, 14),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.secondary,
        },
        subtitle: {
          fontSize: getResponsiveValue(15, 17, 19),
          color: colors.text,
          marginBottom: getResponsiveValue(8, 10, 12),
        },
        textInput: {
          backgroundColor: colors.background,
          color: colors.text,
          fontSize: getResponsiveValue(18, 20, 22),
        },
        buttonEnabled: {
          padding: getResponsiveValue(8, 10, 12),
          minHeight: getResponsiveValue(56, 60, 64),
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
        },
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles, colors };
};
