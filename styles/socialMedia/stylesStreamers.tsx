import { StatusBar, StyleSheet } from "react-native";
import { useResponsiveLayout } from "../../components/context/LayoutContext";
import { MD3Theme, useTheme } from "react-native-paper";

export const useStylesStreamers = () => {
  const theme: MD3Theme = useTheme();
  const { isPhone, isTablet } = useResponsiveLayout();

  const containerPadding = isPhone ? 10 : isTablet ? 15 : 20;
  const textTitleFontSize = isPhone ? 20 : isTablet ? 22 : 24;
  const valueFontSize = isPhone ? 16 : isTablet ? 18 : 20;
  const streamerImageSize = isPhone ? 100 : isTablet ? 150 : 200;
  const marginSizeNameStreamer = isPhone ? 5 : isTablet ? 10 : 15;
  const paddingTextInput = isPhone ? 5 : isTablet ? 10 : 15;

  return StyleSheet.create({
    containerSafeAreaView: {
      flex: 1,
      padding: containerPadding,
      width: "100%",
      backgroundColor: theme.colors.background,
      paddingTop: StatusBar.currentHeight,
    },
    title: {
      fontSize: textTitleFontSize,
      fontWeight: "bold",
      color: theme.colors.onBackground,
      textAlign: "center",
      marginVertical: 10,
    },
    textInput: {
      backgroundColor: theme.colors.surface,
      flex: 1,
      margin: 10,
      padding: paddingTextInput,
      borderRadius: 5,
    },
    containerScrollView: {
      flex: 1,
      width: "100%",
    },
    contentContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
    },
    containerAdd: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginVertical: 10,
    },
    buttonAdd: {
      backgroundColor: theme.colors.primary,
      padding: 10,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 5,
      margin: 10,
      width: "auto",
    },
    textButton: {
      color: theme.colors.onPrimary,
      fontSize: valueFontSize,
      textAlign: "center",
    },
    containerStreamer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginVertical: 10,
    },
    streamerImage: {
      width: streamerImageSize,
      height: streamerImageSize,
      borderRadius: 15,
    },
    containerData: {
      flex: 1,
      marginHorizontal: 10,
      justifyContent: "space-evenly",
      alignItems: "center",
      flexDirection: "row",
    },
    nameStreamer: {
      fontSize: valueFontSize,
      fontWeight: "bold",
      color: theme.colors.onBackground,
      marginTop: marginSizeNameStreamer,
    },
    isLiveStreamer: {
      fontSize: valueFontSize,
      color: theme.colors.onBackground,
    },
    containerImageAndName: {
      alignItems: "center",
      justifyContent: "center",
    },
    buttonVisit: {
      backgroundColor: theme.colors.primary,
      padding: 10,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 5,
      margin: 10,
    },
    containerButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center",
      flex: 1,
    },
    youreStreamers: {
      fontSize: textTitleFontSize - 2,
      fontWeight: "bold",
      color: theme.colors.onBackground,
      textAlign: "center",
      marginVertical: 10,
    },
  });
};
