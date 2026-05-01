import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesCryptosSettings = () => {
  const { colors } = useTheme();
  const { getCommonStyles, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        itemSearchContainer: {
          ...getCommonStyles("shadow").shadow,
          padding: 12,
          backgroundColor: colors.secondary,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: colors.primary,
          marginBottom: 10,
        },
        listSearch: {
          ...getCommonStyles("shadow").shadow,
          maxHeight: 200,
        },
        ...texts,
        ...getCommonStyles("divider"),
        ...getCommonStyles("container"),
        ...getCommonStyles("rowSwitchText"),
        ...getCommonStyles("sectionContainer"),
      }),
    [getCommonStyles, texts, colors],
  );

  return { styles, colors };
};
