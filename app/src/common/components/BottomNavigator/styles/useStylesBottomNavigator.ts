import { useTheme } from "@context/ThemeContext";

const useStylesBottomNavigator = () => {
  const { colors } = useTheme();

  return { colors };
};

export default useStylesBottomNavigator;
