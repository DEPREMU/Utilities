import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { useResponsiveLayout } from "@context/LayoutContext";
import { StyleSheet, ViewStyle } from "react-native";

export const useStylesSelectionScreen = () => {
  const { colors } = useTheme();
  const { getResponsiveValue, getCommonStyles, texts } = useResponsiveLayout();

  const bottomButton: ViewStyle = useMemo(
    () => ({
      ...getCommonStyles("shadow").shadow,
      justifyContent: "center",
      alignItems: "center",
      padding: getResponsiveValue(6, 8, 10, 12),
      borderColor: colors.accent,
      borderRadius: getResponsiveValue(12, 14, 16, 18),
      marginHorizontal: getResponsiveValue(6, 7, 8, 10),
    }),
    [colors, getCommonStyles, getResponsiveValue],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        clearCacheButton: {
          ...bottomButton,
          backgroundColor: colors.error,
        },
        showSelectedButton: {
          ...bottomButton,
          backgroundColor: colors.primary,
        },
        buttonsContainer: {
          gap: getResponsiveValue(8, 10, 12, 16),
          flexDirection: "row",
          paddingVertical: getResponsiveValue(12, 14, 16, 20),
          backgroundColor: colors.background,
          paddingHorizontal: getResponsiveValue(8, 10, 12, 16),
          alignSelf: "center",
          width: "100%",
          justifyContent: "center",
        },
        ...texts,
        ...getCommonStyles("FAB"),
        ...getCommonStyles("flex"),
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
        ...getCommonStyles("sectionContainer"),
      }),
    [colors, getCommonStyles, getResponsiveValue, texts, bottomButton],
  );

  return { styles, colors };
};
