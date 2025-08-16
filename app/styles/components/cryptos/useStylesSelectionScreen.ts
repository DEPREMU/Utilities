import { DimensionValue, StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesSelectionScreen = () => {
  const { isTablet, isWeb, isLargeTablet } = useResponsiveLayout();

  const getResponsiveValue = <T = number>(
    phone: T,
    tablet: T,
    largeTablet: T,
    web: T,
  ) => {
    if (isWeb) return web;
    if (isLargeTablet) return largeTablet;
    if (isTablet) return tablet;
    return phone;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: getResponsiveValue(20, 25, 30, 35),
      backgroundColor: "#0f0f23",
      width: "100%",
    },
    header: {
      marginBottom: getResponsiveValue(20, 25, 30, 35),
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#1e1e2e",
      paddingVertical: getResponsiveValue(20, 24, 28, 32),
      paddingHorizontal: getResponsiveValue(16, 20, 24, 32),
      borderBottomLeftRadius: getResponsiveValue(20, 22, 24, 28),
      borderBottomRightRadius: getResponsiveValue(20, 22, 24, 28),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
      maxHeight: getResponsiveValue(150, 120, 140, 160),
    },
    scrollContainer: {
      flex: 1,
      marginBottom: getResponsiveValue(70, 80, 90, 100),
      paddingHorizontal: getResponsiveValue(8, 20, 24, 32),
    },
    scrollContentContainer: {
      justifyContent: "center",
    },
    checkBoxRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
      padding: getResponsiveValue(8, 16, 20, 24),
      backgroundColor: "#1e1e2e",
      borderRadius: getResponsiveValue(12, 14, 16, 18),
      marginVertical: getResponsiveValue(6, 7, 8, 10),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
      borderWidth: 1,
      borderColor: "#2a2a40",
      minHeight: getResponsiveValue(60, 65, 70, 80),
    },
    text: {
      fontSize: getResponsiveValue(16, 17, 18, 20),
      padding: getResponsiveValue(8, 9, 10, 12),
      color: "#ffffff",
      fontWeight: "600",
      marginLeft: getResponsiveValue(12, 14, 16, 18),
    },
    buttonText: {
      color: "#ffffff",
      fontSize: getResponsiveValue(16, 17, 18, 20),
      textAlign: "center",
      fontWeight: "700",
    },
    clearCacheButton: {
      flex: 1,
      padding: getResponsiveValue(14, 16, 18, 20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#e74c3c",
      borderRadius: getResponsiveValue(12, 14, 16, 18),
      marginHorizontal: getResponsiveValue(6, 7, 8, 10),
      shadowColor: "#e74c3c",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    showSelectedButton: {
      flex: 1,
      padding: getResponsiveValue(14, 16, 18, 20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#4a90e2",
      borderRadius: getResponsiveValue(12, 14, 16, 18),
      marginHorizontal: getResponsiveValue(6, 7, 8, 10),
      shadowColor: "#4a90e2",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    buttonsBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: isWeb ? "row" : "row",
      paddingHorizontal: getResponsiveValue(16, 20, 24, 32),
      paddingVertical: getResponsiveValue(12, 14, 16, 20),
      backgroundColor: "#0f0f23",
      borderTopWidth: 1,
      borderTopColor: "#2a2a40",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 6,
      maxWidth: isWeb ? 1200 : "100%",
      alignSelf: "center",
      width: "100%",
    },
    input: {
      backgroundColor: "#2a2a40",
      color: "#ffffff",
      fontSize: getResponsiveValue(16, 17, 18, 20),
      textAlign: "center",
      borderColor: "#4a90e2",
      borderWidth: 2,
      borderRadius: getResponsiveValue(10, 11, 12, 14),
      width: getResponsiveValue<DimensionValue>("100%", "100%", "100%", "80%"),
    },
    inputContainer: {
      flexDirection: isWeb && isLargeTablet ? "row" : "row",
      alignItems: "center",
      flex: 1,
      paddingVertical: getResponsiveValue(5, 6, 7, 8),
      width: "100%",
      flexWrap: isWeb ? "wrap" : "nowrap",
    },
  });

  return { styles };
};

export default useStylesSelectionScreen;
