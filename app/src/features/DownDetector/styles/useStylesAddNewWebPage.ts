import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesAddNewWebPage = () => {
  const { getCommonStyles, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        ...texts,
        ...getCommonStyles("divider"),
        ...getCommonStyles("container"),
        ...getCommonStyles("rowSwitchText"),
        ...getCommonStyles("sectionContainer"),
      }),
    [getCommonStyles, texts],
  );

  return { styles };
};
