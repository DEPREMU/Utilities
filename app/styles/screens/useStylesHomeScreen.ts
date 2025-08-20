import { useResponsiveLayout } from "@context/LayoutContext";
import { StyleSheet } from "react-native";
import { useTheme } from "@context/ThemeContext";
export const useStylesHomeScreen = () => {
  const colors = useTheme();
  const { isPhone, isWeb } = useResponsiveLayout();
  const { background, text } = colors;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: background,
    },
    contentContainer: {
      flex: 1,
      maxWidth: isWeb ? 800 : "95%",
      width: "100%",
      paddingHorizontal: 20,
      paddingVertical: 40,
      justifyContent: "flex-start",
    },
    title: {
      fontSize: isPhone ? 28 : 36,
      fontWeight: "800",
      color: text,
      textAlign: "center",
      marginBottom: 10,
      letterSpacing: 0.5,
    },
  });

  return { styles, ...colors };
};
