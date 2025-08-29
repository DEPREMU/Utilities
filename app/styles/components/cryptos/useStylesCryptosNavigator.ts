import { useResponsiveLayout } from "@/context/LayoutContext";
import { useTheme } from "@context/ThemeContext";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

const useStylesCryptosNavigator = () => {
  const colors = useTheme();
  const { getCommonStyles } = useResponsiveLayout();
  const { background, primary, text } = colors;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          alignItems: undefined,
        },

        tabBar: {
          ...getCommonStyles("shadow"),
          backgroundColor: background,
          borderTopWidth: 2,
          borderTopColor: primary,
          color: text,
          paddingVertical: 4,
        },
      }),
    [background, primary, text, getCommonStyles],
  );

  return { styles, ...colors };
};

export default useStylesCryptosNavigator;
