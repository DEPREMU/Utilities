import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesCalculatorNavigator = () => {
  const { getCommonStyles } = useResponsiveLayout();
  const colors = useTheme();
  const { background, primary, text } = colors;

  const styles = StyleSheet.create({
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
  });

  return { styles, ...colors };
};

export default useStylesCalculatorNavigator;
