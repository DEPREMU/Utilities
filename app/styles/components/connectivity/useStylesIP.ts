import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesIP = () => {
  const { isPhone, isTablet } = useResponsiveLayout();
  const { background, text, primary, secondary, shadow, accent } = useTheme();

  const styles = StyleSheet.create({
    containerSafeAreaView: {
      flex: 1,
      backgroundColor: background,
    },
    containerScrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingVertical: 30,
      alignItems: "center",
    },
    container: {
      flex: 1,
      alignItems: "center",
      width: "100%",
      maxWidth: 600,
    },
    textIP: {
      fontSize: isPhone ? 26 : isTablet ? 30 : 34,
      fontWeight: "800",
      color: primary,
      marginBottom: 25,
      textAlign: "center",
      letterSpacing: 0.5,
    },
    containerDataIP: {
      width: "100%",
      backgroundColor: secondary,
      borderRadius: 16,
      padding: 25,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 2,
      borderColor: primary,
      marginBottom: 20,
    },
    textISP: {
      fontSize: isPhone ? 20 : isTablet ? 22 : 24,
      fontWeight: "700",
      color: text,
      marginBottom: 15,
      letterSpacing: 0.3,
    },
    textData: {
      fontSize: isPhone ? 17 : isTablet ? 19 : 21,
      color: accent,
      marginBottom: 12,
      fontWeight: "500",
      lineHeight: isPhone ? 24 : isTablet ? 26 : 28,
    },
    mapContainer: {
      width: "100%",
      height: isPhone ? 250 : isTablet ? 300 : 350,
      borderRadius: 16,
      overflow: "hidden",
      marginTop: 25,
      borderWidth: 2,
      borderColor: primary,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
    },
    map: {
      flex: 1,
    },
  });
  return { styles };
};

export default useStylesIP;
