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
          alignSelf: "center",
        },
        title: {
          fontSize: getResponsiveValue(18, 20, 22),
        },
        section: {
          ...getCommonStyles("shadow"),
          width: "100%",
          backgroundColor: colors.primary,
        },
        subtitle: {
          fontSize: getResponsiveValue(14, 16, 18),
        },
        textInput: {
          backgroundColor: colors.secondary,
        },
        buttonEnabled: {
          padding: getResponsiveValue(6, 8, 10, 12),
          flexDirection: "row",
          justifyContent: "space-evenly",
        },
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles, colors };
};
