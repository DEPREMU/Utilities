import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesSettingsClipboard = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        buttonEnabled: {
          padding: getResponsiveValue(8, 10, 12),
          minHeight: getResponsiveValue(56, 60, 64),
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
        },
        ...texts,
        ...getCommonStyles("divider"),
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
        ...getCommonStyles("rowSwitchText"),
        ...getCommonStyles("sectionContainer"),
      }),
    [getCommonStyles, getResponsiveValue, texts],
  );

  return { styles, colors };
};
