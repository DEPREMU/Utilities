import { DimensionValue, StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import { useTheme } from "@context/ThemeContext";

const useStylesSelectionScreen = () => {
  const { background, text, primary, shadow, error, secondary, accent } =
    useTheme();
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
      backgroundColor: background,
      width: "100%",
    },
    header: {
      marginBottom: getResponsiveValue(20, 25, 30, 35),
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: secondary,
      paddingVertical: getResponsiveValue(20, 24, 28, 32),
      paddingHorizontal: getResponsiveValue(16, 20, 24, 32),
      borderBottomLeftRadius: getResponsiveValue(20, 22, 24, 28),
      borderBottomRightRadius: getResponsiveValue(20, 22, 24, 28),
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      gap: getResponsiveValue(10, 12, 14, 16),
      elevation: 8,
      maxHeight: getResponsiveValue(150, 120, 140, 160),
      borderWidth: 2,
      borderColor: primary,
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
      backgroundColor: secondary,
      borderRadius: getResponsiveValue(12, 14, 16, 18),
      marginVertical: getResponsiveValue(6, 7, 8, 10),
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 2,
      borderColor: primary,
      minHeight: getResponsiveValue(60, 65, 70, 80),
    },
    text: {
      fontSize: getResponsiveValue(16, 17, 18, 20),
      padding: getResponsiveValue(8, 9, 10, 12),
      color: text,
      fontWeight: "700",
      marginLeft: getResponsiveValue(12, 14, 16, 18),
      letterSpacing: 0.3,
    },
    buttonText: {
      color: text,
      fontSize: getResponsiveValue(16, 17, 18, 20),
      textAlign: "center",
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    clearCacheButton: {
      flex: 1,
      padding: getResponsiveValue(14, 16, 18, 20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: error,
      borderRadius: getResponsiveValue(12, 14, 16, 18),
      marginHorizontal: getResponsiveValue(6, 7, 8, 10),
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 2,
      borderColor: accent,
    },
    showSelectedButton: {
      flex: 1,
      padding: getResponsiveValue(14, 16, 18, 20),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: primary,
      borderRadius: getResponsiveValue(12, 14, 16, 18),
      marginHorizontal: getResponsiveValue(6, 7, 8, 10),
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
      borderWidth: 2,
      borderColor: secondary,
    },
    buttonsBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: isWeb ? "row" : "row",
      paddingHorizontal: getResponsiveValue(16, 20, 24, 32),
      paddingVertical: getResponsiveValue(12, 14, 16, 20),
      backgroundColor: background,
      borderTopWidth: 2,
      borderTopColor: primary,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 8,
      maxWidth: isWeb ? 1200 : "100%",
      alignSelf: "center",
      width: "100%",
    },
    input: {
      backgroundColor: background,
      color: text,
      fontSize: getResponsiveValue(16, 17, 18, 20),
      textAlign: "center",
      borderColor: primary,
      borderWidth: 2,
      borderRadius: getResponsiveValue(10, 11, 12, 14),
      width: getResponsiveValue<DimensionValue>("100%", "100%", "100%", "80%"),
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    inputAmount: {
      backgroundColor: background,
      color: text,
      fontSize: getResponsiveValue(16, 17, 18, 20),
      textAlign: "center",
      borderColor: primary,
      borderWidth: 2,
      borderRadius: getResponsiveValue(10, 11, 12, 14),
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
  });

  return { styles };
};

export default useStylesSelectionScreen;
