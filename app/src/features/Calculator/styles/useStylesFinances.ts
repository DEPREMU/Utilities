import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@/context/LayoutContext";
import { useMemo } from "react";

const useStylesFinances = () => {
  const { colors } = useTheme();
  const { getCommonStyles, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        ...texts,
        ...getCommonStyles("container"),
      }),
    [getCommonStyles, texts],
  );

  return { styles, colors };
};

export default useStylesFinances;
