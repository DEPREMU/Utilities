import { useTheme } from "react-native-paper";
import { useResponsiveLayout } from "../../components/context/LayoutContext";
import { StatusBar, StyleSheet } from "react-native";

export const stylesSignUp = () => {
  const theme = useTheme();
  const { isPhone, isTablet } = useResponsiveLayout();

  const marginVerticalImageUser = isPhone ? 20 : isTablet ? 40 : 80;
  const widthFormSignin = isPhone ? 350 : isTablet ? 500 : 600;
  const maxWidthFormSignin = isPhone ? 350 : isTablet ? 500 : 600;

  return StyleSheet.create({
    containerScrollView: {
      flex: 1,
      paddingTop: StatusBar.currentHeight || 25,
      backgroundColor: theme.colors.surface,
    },
    contentContainerScrollView: {
      flexGrow: 1,
      backgroundColor: theme.colors.surface,
      justifyContent: "flex-start",
      alignItems: "center",
    },
    formSignin: {
      width: widthFormSignin,
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      shadowColor: theme.colors.onSurface,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 5,
      maxWidth: maxWidthFormSignin,
      minWidth: "auto",
    },
    imageUser: {
      width: 120,
      height: 120,
      marginVertical: marginVerticalImageUser,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      fontFamily: "fontApp",
      color: theme.colors.primary,
      textAlign: "center",
      marginBottom: 20,
      textShadowColor: theme.colors.onSurface,
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    text: {
      fontSize: 16,
      fontFamily: "fontApp",
      color: theme.colors.onSurface,
      marginBottom: 5,
    },
    textInputUser: {
      height: 45,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      borderRadius: 8,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.background,
      shadowColor: theme.colors.onSurface,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      marginBottom: 15,
    },
    textButton: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.onPrimary,
      textAlign: "center",
    },
    buttonSignin: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 20,
      marginVertical: 10,
      width: "100%",
      alignItems: "center",
      shadowColor: theme.colors.onSurface,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 5,
    },
    containerFields: {
      width: "100%",
      marginVertical: 5,
    },
    buttonShowPassword: {
      flexDirection: "row",
      alignItems: "center",
      shadowColor: theme.colors.onSurface,
      marginBottom: 5,
    },
    textShowPassword: {
      fontSize: 14,
      color: theme.colors.primary,
      fontFamily: "fontApp",
    },
    buttonLink: {
      backgroundColor: theme.colors.background,
      paddingVertical: 10,
      paddingHorizontal: 15,
      marginVertical: 5,
      borderRadius: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    textLink: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: "bold",
      textDecorationLine: "underline",
    },
    containerHaveAnAccount: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      flexWrap: "wrap",
    },
  });
};
