import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesHomeScreen = () => {
  const theme = useTheme();
  const { getCommonStyles, getResponsiveValue, texts } = useResponsiveLayout();
  const { colors } = theme;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        buttonContainer: {
          width: "100%",
          padding: 0,
          justifyContent: "center",
        },
        leftIcon: {
          position: "absolute",
          alignSelf: "center",
          left: getResponsiveValue(10, 15, 20, 25),
          zIndex: 10,
          marginRight: getResponsiveValue(10, 15, 20, 25),
        },
        doesNotHaveInternet: {
          fontSize: getResponsiveValue(14, 16, 18),
          fontWeight: "600",
          color: colors.text,
          textAlign: "center",
          marginBottom: 20,
          letterSpacing: 0.5,
        },
        footer: {
          fontSize: getResponsiveValue(12, 14, 16),
          fontWeight: "400",
          color: colors.text,
          textAlign: "right",
          marginVertical: 10,
          letterSpacing: 0.5,
          width: "100%",
        },
        ...texts,
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
      }),
    [getCommonStyles, getResponsiveValue, colors, texts],
  );

  return { styles, colors };
};
