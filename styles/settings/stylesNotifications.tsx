import { useTheme } from "react-native-paper";
import { StatusBar, StyleSheet } from "react-native";
import { useResponsiveLayout } from "../../components/context/LayoutContext";

const useStylesNotifications = () => {
  const theme = useTheme();
  const { isPhone, isTablet, height } = useResponsiveLayout();

  const widthNavBar = isPhone ? 175 : isTablet ? 200 : 250;
  const fontSizeTexts = isPhone ? 14 : isTablet ? 16 : 18;
  const paddingNavBar = isPhone ? 10 : isTablet ? 13 : 16;
  const sizeSettingsImage = isPhone ? 40 : isTablet ? 50 : 60;
  const headerTextFontSize = isPhone ? 20 : isTablet ? 24 : 28;
  const paddingContainer = isPhone ? 10 : isTablet ? 20 : 30;

  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      padding: paddingContainer,
      paddingTop: StatusBar.currentHeight || 25,
    },
    containerSafeAreaView: {
      flex: 1,
      paddingTop: StatusBar.currentHeight || 25,
      backgroundColor: theme.colors.background,
    },
    scrollViewContainer: {
      flex: 1,
      width: "100%",
    },
    headerText: {
      fontSize: headerTextFontSize,
      fontWeight: "bold",
      marginBottom: 20,
      color: theme.colors.onBackground,
      width: "100%",
      textAlign: "center",
    },
    scrollViewContentContainer: {
      justifyContent: "flex-start",
      alignItems: "center",
    },
    containerEachNotification: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "80%",
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.onBackground,
    },
    textEachNotification: {
      fontSize: fontSizeTexts,
      color: theme.colors.onBackground,
    },
    error: {
      color: theme.colors.error,
      fontSize: fontSizeTexts,
      marginTop: 5,
    },
  });
};
export default useStylesNotifications;
