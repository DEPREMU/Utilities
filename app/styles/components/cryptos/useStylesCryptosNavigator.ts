import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";

const useStylesCryptosNavigator = () => {
  const { background, primary, text, shadow } = useTheme();

  const styles = StyleSheet.create({
    tabBar: {
      backgroundColor: background,
      borderTopWidth: 2,
      borderTopColor: primary,
      color: text,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 6,
      paddingVertical: 8,
    },
  });

  return { styles };
};

export default useStylesCryptosNavigator;
