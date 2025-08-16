import { useResponsiveLayout } from "@context/LayoutContext";
import { StyleSheet } from "react-native";

/**
 * @function stylesLoginScreen
 * @returns {{ styles: object, height: number, width: number }}
 */
const useStylesAuthScreens = () => {
  const { width, height } = useResponsiveLayout();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#00a69d",
      justifyContent: "center",
      alignItems: "center",
    },
    background: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#00a69d",
    },
    content: {
      width: "90%",
      maxWidth: 500,
      backgroundColor: "#f0f4f7",
      borderRadius: 15,
      padding: 25,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    logo: {
      width: 120,
      height: 120,
      marginBottom: 25,
    },
    title: {
      fontSize: 22,
      fontWeight: "600",
      color: "#2c3e50",
      textAlign: "center",
      marginBottom: 30,
      width: "100%",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: 10,
      marginBottom: 15,
      width: "90%",
    },
    icon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      color: "#333",
      borderRadius: 10,
    },
    showPasswordButton: {
      width: 30,
      height: 30,
      justifyContent: "center",
      alignItems: "center",
      padding: 0,
      position: "absolute",
      right: 10,
      marginLeft: 5,
      zIndex: 2,
    },
    loginButton: {
      backgroundColor: "#3498db",
      borderRadius: 10,
      height: 50,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 25,
      width: "90%",
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    inputError: {
      borderWidth: 2,
      borderColor: "#ff0000",
    },
    linksContainer: {
      width: "100%",
      alignItems: "center",
    },
    linkText: {
      color: "#00a69d",
      fontSize: 14,
      marginVertical: 8,
      fontWeight: "500",
    },
    errorText: {
      color: "#e74c3c",
      fontSize: 14,
      textAlign: "center",
      marginTop: 15,
      width: "100%",
    },
    inputPassword: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: 10,
      marginBottom: 0,
      paddingHorizontal: 0,
      width: "100%",
      height: 50,
    },
    rememberMeContainer: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      justifyContent: "space-around",
    },
    rememberMeText: {
      color: "#2c3e50",
      fontSize: 14,
      fontWeight: "500",
    },
    loadingIndicator: {
      width: 20,
      height: 20,
    },
    iconImageShowPassword: {
      width: 20,
      height: 20,
    },
    marginRight10: { marginRight: 10 },
  });

  return { styles, height, width };
};

export default useStylesAuthScreens;
