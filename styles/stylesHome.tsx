import { useTheme } from "react-native-paper";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "../components/context/LayoutContext";

const useStylesHome = () => {
  const theme = useTheme();
  const { isPhone, isTablet } = useResponsiveLayout();

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: isPhone ? 10 : isTablet ? 20 : 30,
    },
    headerText: {
      fontSize: isPhone ? 20 : isTablet ? 24 : 28,
      fontWeight: "bold",
      marginBottom: 20,
      color: theme.colors.onBackground,
    },
    buttonContainer: {
      width: "100%",
      alignItems: "center",
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: isPhone ? 10 : isTablet ? 15 : 20,
      paddingHorizontal: isPhone ? 20 : isTablet ? 30 : 40,
      marginVertical: 10,
      width: "100%",
      alignItems: "center",
    },
    buttonText: {
      color: theme.colors.onPrimary,
      fontSize: isPhone ? 16 : isTablet ? 18 : 20,
      fontWeight: "600",
    },
    scrollViewButtonContainer: { flex: 1, width: "100%" },
  });
};
export default useStylesHome;
