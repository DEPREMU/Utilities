import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesComputerControl = () => {
  const { colors } = useTheme();
  const { getCommonStyles, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        ...texts,
        ...getCommonStyles("FAB"),
        ...getCommonStyles("container"),
        ...getCommonStyles("flexCenter"),
        ...getCommonStyles("scrollView"),
        ...getCommonStyles("sectionContainer"),
      }),
    [getCommonStyles, texts],
  );

  return { styles, colors };
};
