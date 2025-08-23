import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

/**
 * @function  useStylesAuthScreens
 */
const useStylesAuthScreens = () => {
  const colors = useTheme();
  const { width, height, getCommonStyles } = useResponsiveLayout();
  const { background, primary, secondary, text, shadow, error } = colors;

  const styles = StyleSheet.create({
    container: {
      ...getCommonStyles("mainContainer", { fallbackValues: [40, 20] }),
      backgroundColor: background,
    },
    content: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: secondary,
      borderRadius: 20,
      padding: 30,
      alignItems: "center",
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
      borderWidth: 2,
      borderColor: primary,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: text,
      textAlign: "center",
      marginBottom: 35,
      width: "100%",
      letterSpacing: 0.5,
    },
    inputContainer: {
      width: "100%",
      marginBottom: 20,
      position: "relative",
    },
    input: {
      width: "100%",
      backgroundColor: background,
      borderRadius: 12,
      fontSize: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: text,
    },
    showPasswordButton: {
      position: "absolute",
      right: 15,
      top: "50%",
      transform: [{ translateY: -12 }],
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    loginButton: {
      backgroundColor: primary,
      borderRadius: 12,
      height: 56,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 30,
      width: "100%",
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 2,
      borderColor: secondary,
    },
    buttonText: {
      color: text,
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    inputError: {
      borderWidth: 2,
      borderColor: error,
      backgroundColor: background,
    },
    linksContainer: {
      width: "100%",
      alignItems: "center",
      marginTop: 20,
    },
    linkText: {
      color: primary,
      fontSize: 16,
      marginVertical: 12,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    errorText: {
      color: error,
      fontSize: 14,
      textAlign: "center",
      marginTop: 10,
      marginBottom: 10,
      width: "100%",
      fontWeight: "500",
    },
    rememberMeContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      marginTop: 20,
      marginBottom: 10,
      paddingHorizontal: 5,
    },
    rememberMeText: {
      color: text,
      fontSize: 16,
      fontWeight: "500",
    },
    loadingIndicator: {
      marginRight: 10,
    },
    marginRight10: {
      marginRight: 10,
    },
  });

  return { styles, height, width, ...colors };
};

export default useStylesAuthScreens;
