import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesBottomNavigator = () => {
  const { colors } = useTheme();
  const { getResponsiveValue } = useResponsiveLayout();

  const styles = StyleSheet.create({
    tabBar: {
      backgroundColor: colors.overlay,
      borderRadius: getResponsiveValue(18, 20, 22),
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: getResponsiveValue(64, 68, 72),
    },
  });

  return {
    styles,
    colors,
  };
};

export default useStylesBottomNavigator;
