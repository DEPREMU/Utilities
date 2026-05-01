import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { DimensionValue, StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesSyncScreen = () => {
  const { colors } = useTheme();
  const { texts, getCommonStyles, getResponsiveValue, height } =
    useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("flexCenter").flexCenter,
          opacity: 0.8,
          alignSelf: "center",
          backgroundColor: colors.background,
        },
        contentContainer: {
          ...getCommonStyles("sectionContainer").sectionContainer,
          width: getResponsiveValue<DimensionValue>("90%", "80%", "60%"),
          backgroundColor: colors.accent,
          minHeight: getResponsiveValue(200, 250, 300),
        },
        activityIndicator: {
          position: "absolute",
          left: 10,
        },
        ...texts,
        ...getCommonStyles("flex"),
        ...getCommonStyles("divider"),
        ...getCommonStyles("rowSwitchText"),
      }),
    [colors, getCommonStyles, getResponsiveValue, texts],
  );

  return { styles, height };
};
