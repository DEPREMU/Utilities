import { useTheme } from "react-native-paper";
import { StatusBar, StyleSheet } from "react-native";
import { useResponsiveLayout } from "../components/context/LayoutContext";

const useStylesHome = () => {
  const theme = useTheme();
  const { isPhone, isTablet, height } = useResponsiveLayout();

  const widthNavBar = isPhone ? 175 : isTablet ? 200 : 250;
  const fontSizeTexts = isPhone ? 14 : isTablet ? 16 : 18;
  const paddingNavBar = isPhone ? 10 : isTablet ? 13 : 16;
  const sizeSettingsImage = isPhone ? 40 : isTablet ? 50 : 60;

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: isPhone ? 10 : isTablet ? 20 : 30,
      paddingTop: StatusBar.currentHeight || 25,
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
    scrollViewButtonContainer: {
      flex: 1,
      width: "100%",
    },
    headerContainer: {
      width: "100%",
      justifyContent: "center",
      marginVertical: 10,
    },
    navBar: {
      position: "absolute",
      width: widthNavBar,
      top: 0 ,
      height: height * 1.5,
      zIndex: 1000,
      backgroundColor: theme.colors.primaryContainer,
      padding: paddingNavBar,
      paddingTop: StatusBar.currentHeight || 25,
    },
    containerScrollViewNavBar: {
      flex: 1,
      width: "100%",
    },
    contentContainerNavBar: {
      alignItems: "flex-start",
      justifyContent: "flex-start",
    },
    buttonNavBar: {
      backgroundColor: theme.colors.onPrimaryContainer,
      width: "100%",
      paddingVertical: 10,
      paddingHorizontal: 15,
      marginVertical: 5,
      borderRadius: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    textButtonNav: {
      color: theme.colors.background,
      fontSize: fontSizeTexts,
      fontWeight: "bold",
    },
    imageSettings: {
      width: sizeSettingsImage,
      height: sizeSettingsImage,
    },
  });
};
export default useStylesHome;
