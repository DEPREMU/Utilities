import { useColors } from "@hooks/useColors";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesIP_API = () => {
  const { isPhone, isTablet, isLargeTablet } = useResponsiveLayout();
  const { background, text, primary, secondary, shadow, accent } = useColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: isPhone ? 20 : isTablet ? 25 : isLargeTablet ? 30 : 35,
      width: "100%",
      backgroundColor: background,
      alignItems: "center",
    },
    textIP: {
      fontSize: isPhone ? 24 : isTablet ? 28 : isLargeTablet ? 32 : 36,
      fontWeight: "800",
      marginBottom: isPhone ? 20 : 25,
      textAlign: "center",
      color: primary,
      letterSpacing: 0.5,
    },
    value: {
      fontSize: isPhone ? 18 : isTablet ? 20 : isLargeTablet ? 22 : 24,
      color: accent,
      fontWeight: "600",
    },
    containerDataIP: {
      backgroundColor: secondary,
      borderRadius: 16,
      padding: isPhone ? 18 : isTablet ? 22 : isLargeTablet ? 25 : 28,
      marginBottom: isPhone ? 16 : 20,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 2,
      borderColor: primary,
      width: "100%",
      maxWidth: 500,
    },
    textKey: {
      fontSize: isPhone ? 16 : isTablet ? 18 : isLargeTablet ? 20 : 22,
      fontWeight: "700",
      marginBottom: 8,
      color: text,
      letterSpacing: 0.3,
    },
    mapContainer: {
      height: isPhone ? 200 : isTablet ? 250 : isLargeTablet ? 300 : 350,
      marginTop: isPhone ? 20 : 25,
      borderWidth: 2,
      borderColor: primary,
      borderRadius: 16,
      overflow: "hidden",
      width: "100%",
      maxWidth: 500,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
  });

  return { styles };
};

export default useStylesIP_API;
