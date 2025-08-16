import { useColors } from "@hooks/useColors";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesIPQuery = () => {
  const { isPhone, isTablet, isWeb } = useResponsiveLayout();
  const { background, primary, secondary, text, shadow, accent } = useColors();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: isPhone ? 16 : isTablet ? 20 : 24,
      width: isPhone ? "100%" : isTablet ? "95%" : "90%",
      backgroundColor: background,
      alignSelf: isWeb ? "center" : "stretch",
      maxWidth: isWeb ? 1200 : undefined,
    },
    textIP: {
      fontSize: isPhone ? 24 : isTablet ? 28 : 32,
      fontWeight: "800",
      marginBottom: isPhone ? 20 : 25,
      textAlign: "center",
      color: primary,
      letterSpacing: 0.5,
    },
    valueIP: {
      fontSize: isPhone ? 18 : isTablet ? 20 : 22,
      color: accent,
      fontWeight: "600",
    },
    containerDataIP: {
      backgroundColor: secondary,
      borderRadius: 16,
      padding: isPhone ? 18 : 22,
      marginBottom: isPhone ? 16 : 20,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 8,
      borderWidth: 2,
      borderColor: primary,
    },
    textKey: {
      fontSize: isPhone ? 16 : isTablet ? 18 : 20,
      fontWeight: "700",
      marginBottom: 8,
      marginVertical: 6,
      color: text,
      letterSpacing: 0.3,
    },
    value: {
      fontSize: isPhone ? 16 : isTablet ? 18 : 20,
      color: accent,
      fontWeight: "500",
    },
    mapContainer: {
      height: isPhone ? 200 : isTablet ? 250 : 300,
      marginTop: isPhone ? 20 : 25,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: primary,
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

export default useStylesIPQuery;
