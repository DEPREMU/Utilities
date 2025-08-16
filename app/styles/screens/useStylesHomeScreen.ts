import { useResponsiveLayout } from "@context/LayoutContext";
import { StyleSheet } from "react-native";
import { useColors } from "@hooks/useColors";

export const useStylesHomeScreen = () => {
  const { isPhone } = useResponsiveLayout();
  const { background, primary } = useColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: background,
    },
    title: {
      fontSize: isPhone ? 24 : 32,
      fontWeight: "bold",
      color: primary,
    },
  });

  return { styles };
};
