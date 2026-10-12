import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesComputerControl = () => {
  const { colors } = useAppBehavior();
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
