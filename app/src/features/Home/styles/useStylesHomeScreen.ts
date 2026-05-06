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
        rightIcon: {
          position: "absolute",
          alignSelf: "center",
          right: getResponsiveValue(10, 15, 20, 25),
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
          ...getCommonStyles("rowSwitchText").rowSwitchText,
          padding: undefined,
        },
        ...texts,
        ...getCommonStyles("divider"),
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
      }),
    [getCommonStyles, getResponsiveValue, colors, texts],
  );

  return { styles, colors };
};
