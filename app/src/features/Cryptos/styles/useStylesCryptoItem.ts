import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesCryptoItem = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        padding0: {
          padding: 0,
        },
        crypto: {
          ...getCommonStyles("sectionContainer").sectionContainer,
          minHeight: getResponsiveValue(140, 160, 180),
        },
        check: {
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between",
        },
        ...texts,
        ...getCommonStyles("divider"),
      }),
    [getCommonStyles, getResponsiveValue, texts],
  );
  return { styles, colors };
};
