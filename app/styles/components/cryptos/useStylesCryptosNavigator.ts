import { useResponsiveLayout } from "@/context/LayoutContext";
import { useTheme } from "@context/ThemeContext";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

const useStylesCryptosNavigator = () => {
  const { colors } = useTheme();
  const { getCommonStyles } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          alignItems: undefined,
        },

        tabBar: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.background,
          borderTopWidth: 2,
          borderTopColor: colors.primary,
          color: colors.text,
          paddingVertical: 4,
        },
      }),
    [colors, getCommonStyles],
  );

  return { styles, colors };
};

export default useStylesCryptosNavigator;
