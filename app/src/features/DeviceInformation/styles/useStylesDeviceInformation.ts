import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesDeviceInformation = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        keyValueRow: {
          gap: getResponsiveValue(8, 10, 12),
          alignItems: getResponsiveValue("flex-start", "center", "center"),
          flexDirection: getResponsiveValue("column", "row", "row"),
          paddingVertical: getResponsiveValue(4, 6, 8),
        },
        keyContainer: {
          flex: getResponsiveValue(1, 1.2, 1.2),
          marginRight: getResponsiveValue(0, 12, 16, 20),
          marginBottom: getResponsiveValue(0, 4, 6, 8),
        },
        valueContainer: {
          ...getCommonStyles("shadow").shadow,
          ...getCommonStyles("container").container,
          flex: getResponsiveValue(undefined, 1, 1),
          padding: getResponsiveValue(8, 12, 16),
          minHeight: getResponsiveValue(40, 44, 48),
          alignItems: "flex-start",
          borderRadius: getResponsiveValue(6, 8, 10),
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
        },
        ...texts,
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
        ...getCommonStyles("sectionContainer"),
      }),
    [texts, colors, getCommonStyles, getResponsiveValue],
  );

  return { styles, colors };
};
