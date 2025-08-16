import { useResponsiveLayout } from "@context/LayoutContext";
import { StyleSheet } from "react-native";
import { useColors } from "@hooks/useColors";

const useStylesIP_API = () => {
  const { isPhone, isTablet, isLargeTablet } = useResponsiveLayout();
  const { background, text, primary, secondary, border, shadow } = useColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: isPhone ? 15 : isTablet ? 20 : isLargeTablet ? 25 : 30,
      width: "95%",
      backgroundColor: background,
    },
    textIP: {
      fontSize: isPhone ? 20 : isTablet ? 24 : isLargeTablet ? 28 : 32,
      fontWeight: "bold",
      marginBottom: isPhone ? 15 : 20,
      textAlign: "center",
      color: primary,
    },
    value: {
      fontSize: isPhone ? 16 : isTablet ? 18 : isLargeTablet ? 20 : 22,
      color: secondary,
    },
    containerDataIP: {
      backgroundColor: secondary,
      borderRadius: 10,
      padding: isPhone ? 12 : isTablet ? 15 : isLargeTablet ? 18 : 20,
      marginBottom: isPhone ? 12 : 15,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 3,
      borderWidth: 1,
      borderColor: border,
    },
    textKey: {
      fontSize: isPhone ? 14 : isTablet ? 16 : isLargeTablet ? 18 : 20,
      fontWeight: "bold",
      marginBottom: 5,
      color: text,
    },
    mapContainer: {
      height: isPhone ? 150 : isTablet ? 200 : isLargeTablet ? 250 : 300,
      marginTop: isPhone ? 15 : 20,
      borderWidth: 1,
      borderColor: border,
      borderRadius: 10,
      overflow: "hidden",
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
  });

  return { styles };
};

export default useStylesIP_API;
