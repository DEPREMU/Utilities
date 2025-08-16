import { useResponsiveLayout } from "@context/LayoutContext";
import { StyleSheet } from "react-native";

const useStylesIPQuery = () => {
  const { isPhone, isTablet, isWeb } = useResponsiveLayout();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: isPhone ? 16 : isTablet ? 20 : 24,
      width: isPhone ? "100%" : isTablet ? "95%" : "90%",
      backgroundColor: "#f5f5f5",
      alignSelf: isWeb ? "center" : "stretch",
      maxWidth: isWeb ? 1200 : undefined,
    },
    textIP: {
      fontSize: isPhone ? 20 : isTablet ? 24 : 28,
      fontWeight: "bold",
      marginBottom: isPhone ? 16 : 20,
      textAlign: "center",
      color: "#333",
    },
    valueIP: {
      fontSize: isPhone ? 16 : isTablet ? 18 : 20,
      color: "#1E90FF",
    },
    containerDataIP: {
      backgroundColor: "#fff",
      borderRadius: 10,
      padding: isPhone ? 12 : 15,
      marginBottom: isPhone ? 12 : 15,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
    },
    textKey: {
      fontSize: isPhone ? 14 : isTablet ? 16 : 18,
      fontWeight: "bold",
      marginBottom: 5,
      marginVertical: 5,
      color: "#333",
    },
    value: {
      fontSize: isPhone ? 14 : isTablet ? 16 : 18,
      color: "#1E90FF",
    },
    mapContainer: {
      height: isPhone ? 150 : isTablet ? 200 : 250,
      marginTop: isPhone ? 16 : 20,
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
  });

  return { styles };
};

export default useStylesIPQuery;
