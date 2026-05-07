import { useTheme } from "@context/ThemeContext";

export const useStylesBottomNavigator = () => {
  const { colors } = useTheme();

  return { colors };
};
