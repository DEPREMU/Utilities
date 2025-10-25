import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { DimensionValue, StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesHomeScreen = () => {
  const theme = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();
  const { colors } = theme;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer", { fallbackValues: [10, 5] }),
          backgroundColor: colors.background,
        },
        scrollViewContainer: {
          flex: 1,
          maxWidth: getResponsiveValue<DimensionValue>("95%", "95%", 800),
          width: "100%",
          paddingHorizontal: 20,
        },
        scrollViewContentContainer: {
          alignItems: "center",
          justifyContent: "flex-start",
        },
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
        title: {
          fontSize: getResponsiveValue(28, 28, 36),
          fontWeight: "800",
          color: colors.text,
          textAlign: "center",
          marginBottom: 10,
          letterSpacing: 0.5,
        },
        doesNotHaveInternet: {
          fontSize: getResponsiveValue(14, 16, 18),
          fontWeight: "600",
          color: colors.text,
          textAlign: "center",
          marginBottom: 20,
          letterSpacing: 0.5,
        },
      }),
    [colors.background, getCommonStyles, getResponsiveValue, colors.text],
  );

  return { styles, ...colors };
};
