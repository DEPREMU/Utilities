import { useTheme } from "@/context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@/context/LayoutContext";

const useStylesFinances = () => {
  const theme = useTheme();
  const { isWeb, getCommonStyles } = useResponsiveLayout();
  const { primary, background } = theme;

  const styles = StyleSheet.create({
    container: {
      ...getCommonStyles("mainContainer", {
        fallbackValues: [isWeb ? 20 : 16],
      }),
      backgroundColor: background,
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
