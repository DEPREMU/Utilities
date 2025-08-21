import { useResponsiveLayout } from "@/context/LayoutContext";
import { useTheme } from "@/context/ThemeContext";
import { StyleSheet } from "react-native";

const useStylesFinances = () => {
  const theme = useTheme();
  const { isWeb } = useResponsiveLayout();
  const { primary, background } = theme;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: background,
      padding: isWeb ? 20 : 16,
    },
    title: {
      fontSize: isWeb ? 24 : 20,
      fontWeight: "bold",
      color: primary,
    },
  });

  return { styles, ...theme };
};

export default useStylesFinances;
