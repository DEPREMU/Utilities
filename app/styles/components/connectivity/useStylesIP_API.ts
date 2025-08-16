import { useResponsiveLayout } from "@context/LayoutContext";
import { StyleSheet } from "react-native";

const useStylesIP_API = () => {
  const { isPhone, isTablet, isLargeTablet } = useResponsiveLayout();
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: isPhone ? 15 : isTablet ? 20 : isLargeTablet ? 25 : 30,
      width: "95%",
      backgroundColor: "#f5f5f5",
    },
    textIP: {
      fontSize: isPhone ? 20 : isTablet ? 24 : isLargeTablet ? 28 : 32,
      fontWeight: "bold",
      marginBottom: isPhone ? 15 : 20,
      textAlign: "center",
      color: "#333",
    },
    value: {
      fontSize: isPhone ? 16 : isTablet ? 18 : isLargeTablet ? 20 : 22,
      color: "#007BFF",
    },
    containerDataIP: {
      backgroundColor: "#fff",
      borderRadius: 10,
      padding: isPhone ? 12 : isTablet ? 15 : isLargeTablet ? 18 : 20,
      marginBottom: isPhone ? 12 : 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },
    textKey: {
      fontSize: isPhone ? 14 : isTablet ? 16 : isLargeTablet ? 18 : 20,
      fontWeight: "bold",
      marginBottom: 5,
      color: "#333",
    },
    mapContainer: {
      height: isPhone ? 150 : isTablet ? 200 : isLargeTablet ? 250 : 300,
      marginTop: isPhone ? 15 : 20,
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
  });

  return { styles };
};

export default useStylesIP_API;
