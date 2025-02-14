import { MD3Theme, useTheme } from "react-native-paper";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "../../components/context/LayoutContext";
export const useStylesIPScreen = () => {
  const theme: MD3Theme = useTheme();

  const { isPhone, isTablet, isLargeTablet } = useResponsiveLayout();

  return StyleSheet.create({
    containerSafeAreaView: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    containerScrollView: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    contentContainer: {
      padding: isPhone ? 8 : isTablet ? 16 : isLargeTablet ? 24 : 32,
      backgroundColor: theme.colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.onSurface,
      width: "90%",
      marginVertical: isPhone ? 8 : isTablet ? 16 : isLargeTablet ? 24 : 32,
    },
    headerText: {
      fontSize: isPhone ? 20 : isTablet ? 24 : isLargeTablet ? 28 : 32,
      fontWeight: "600",
      textAlign: "center",
      marginVertical: isPhone ? 10 : isTablet ? 15 : isLargeTablet ? 20 : 25,
      color: theme.colors.onBackground,
    },
    IP: {
      fontSize: isPhone ? 18 : isTablet ? 22 : isLargeTablet ? 26 : 30,
      color: theme.colors.primary,
      fontWeight: "500",
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: isPhone ? 10 : isTablet ? 15 : isLargeTablet ? 20 : 25,
      borderRadius: 5,
      alignItems: "center",
      justifyContent: "center",
      marginVertical: isPhone ? 10 : isTablet ? 15 : isLargeTablet ? 20 : 25,
    },
    buttonText: {
      color: theme.colors.onPrimary,
      fontSize: isPhone ? 16 : isTablet ? 18 : isLargeTablet ? 20 : 22,
      fontWeight: "600",
    },
  });
};
