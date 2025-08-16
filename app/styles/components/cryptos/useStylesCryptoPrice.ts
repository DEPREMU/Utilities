import { DimensionValue, StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import { useColors } from "@hooks/useColors";

export const useStylesCryptoPrice = () => {
  const { isTablet, isWeb, isLargeTablet } = useResponsiveLayout();
  const { text, primary, secondary, accent, shadow } = useColors();

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
      backgroundColor: secondary,
      padding: getResponsiveValue(20, 24, 28, 32),
      borderRadius: getResponsiveValue(16, 18, 20, 24),
      width: getResponsiveValue<DimensionValue>("95%", "95%", "95%", "100%"),
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 2,
      borderColor: primary,
      minHeight: getResponsiveValue(200, 220, 240, 260),
    },
    cryptoHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: getResponsiveValue(16, 18, 20, 24),
      paddingBottom: getResponsiveValue(12, 14, 16, 20),
      borderBottomWidth: 2,
      borderBottomColor: primary,
    },
    cryptoName: {
      fontSize: getResponsiveValue(24, 26, 28, 32),
      fontWeight: "800",
      color: text,
      textTransform: "uppercase",
      letterSpacing: 1,
      flex: 1,
    },
    cryptoSymbol: {
      fontSize: getResponsiveValue(14, 15, 16, 18),
      color: accent,
      fontWeight: "600",
      backgroundColor: primary,
      paddingHorizontal: getResponsiveValue(8, 9, 10, 12),
      paddingVertical: getResponsiveValue(4, 5, 6, 7),
      borderRadius: getResponsiveValue(6, 7, 8, 9),
    },
    text: {
      fontSize: getResponsiveValue(16, 17, 18, 20),
      color: text,
      marginBottom: getResponsiveValue(8, 9, 10, 12),
      fontWeight: "500",
      lineHeight: getResponsiveValue(22, 23, 24, 26),
    },
    priceContainer: {
      backgroundColor: primary,
      borderRadius: getResponsiveValue(12, 13, 14, 16),
      padding: getResponsiveValue(16, 17, 18, 20),
      marginBottom: getResponsiveValue(16, 18, 20, 24),
    },
    price: {
      fontSize: getResponsiveValue(20, 22, 24, 28),
      fontWeight: "700",
      color: accent,
      textAlign: "center",
      lineHeight: getResponsiveValue(28, 30, 32, 36),
    },
    priceLabel: {
      fontSize: getResponsiveValue(12, 13, 14, 16),
      color: text,
      textAlign: "center",
      marginBottom: getResponsiveValue(8, 9, 10, 12),
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    infoSection: {
      marginBottom: getResponsiveValue(12, 14, 16, 20),
    },
    ownedText: {
      fontSize: getResponsiveValue(16, 17, 18, 20),
      color: text,
      marginBottom: getResponsiveValue(6, 7, 8, 10),
      fontWeight: "500",
    },
    ownedAmount: {
      fontSize: getResponsiveValue(18, 19, 20, 22),
      fontWeight: "700",
      color: accent,
      marginLeft: getResponsiveValue(8, 9, 10, 12),
    },
    firstInvest: {
      fontSize: getResponsiveValue(15, 16, 17, 19),
      color: text,
      marginBottom: getResponsiveValue(12, 14, 16, 20),
      lineHeight: getResponsiveValue(20, 22, 24, 28),
      fontWeight: "400",
    },
    gainContainer: {
      backgroundColor: primary,
      borderRadius: getResponsiveValue(10, 11, 12, 14),
      padding: getResponsiveValue(12, 13, 14, 16),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    gainAmount: {
      fontSize: getResponsiveValue(16, 17, 18, 20),
      fontWeight: "600",
      color: text,
      flex: 1,
    },
    gainPercent: {
      fontSize: getResponsiveValue(18, 19, 20, 22),
      fontWeight: "800",
      paddingHorizontal: getResponsiveValue(12, 13, 14, 16),
      paddingVertical: getResponsiveValue(6, 7, 8, 10),
      borderRadius: getResponsiveValue(8, 9, 10, 12),
      textAlign: "center",
      minWidth: getResponsiveValue(80, 85, 90, 100),
    },
    datePurchasedText: {
      fontSize: getResponsiveValue(14, 15, 16, 18),
      color: text,
      textAlign: "right",
      marginTop: getResponsiveValue(10, 13, 16, 18),
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    colorGreen: {
      color: accent,
      backgroundColor: primary,
    },
    colorRed: {
      color: accent,
      backgroundColor: primary,
    },
    divider: {
      height: 2,
      backgroundColor: primary,
      marginVertical: getResponsiveValue(12, 14, 16, 20),
      opacity: 0.8,
    },
    statusIndicator: {
      width: getResponsiveValue(8, 9, 10, 12),
      height: getResponsiveValue(8, 9, 10, 12),
      borderRadius: getResponsiveValue(4, 4.5, 5, 6),
      backgroundColor: accent,
      marginRight: getResponsiveValue(8, 9, 10, 12),
    },
    loadingContainer: {
      backgroundColor: secondary,
      borderRadius: getResponsiveValue(16, 18, 20, 24),
      padding: getResponsiveValue(20, 24, 28, 32),
      marginHorizontal: getResponsiveValue(12, 16, 20, 24),
      marginVertical: getResponsiveValue(8, 10, 12, 16),
      alignItems: "center",
      justifyContent: "center",
      minHeight: getResponsiveValue(120, 130, 140, 160),
    },
    loadingText: {
      color: text,
      fontSize: getResponsiveValue(16, 17, 18, 20),
      marginTop: getResponsiveValue(12, 14, 16, 20),
      fontWeight: "500",
    },
  });

  return { styles };
};
