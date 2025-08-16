import { useResponsiveLayout } from "@context/LayoutContext";
import { StyleSheet } from "react-native";

export const useStylesHomeScreen = () => {
  const { isPhone } = useResponsiveLayout();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      width: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: isPhone ? 24 : 32,
      fontWeight: "bold",
    },
  });

  return { styles };
};
