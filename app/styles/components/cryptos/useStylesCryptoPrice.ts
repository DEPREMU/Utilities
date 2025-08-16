import { DimensionValue, StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesCryptoPrice = () => {
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
      backgroundColor: "#1e1e2e",
      padding: getResponsiveValue(20, 24, 28, 32),
      borderRadius: getResponsiveValue(16, 18, 20, 24),
      width: getResponsiveValue<DimensionValue>("95%", "95%", "95%", "100%"),
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      borderWidth: 1,
      borderColor: "#2a2a40",
      minHeight: getResponsiveValue(200, 220, 240, 260),
    },
    cryptoHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: getResponsiveValue(16, 18, 20, 24),
      paddingBottom: getResponsiveValue(12, 14, 16, 20),
      borderBottomWidth: 1,
      borderBottomColor: "#3a3a50",
    },
    cryptoName: {
      fontSize: getResponsiveValue(24, 26, 28, 32),
      fontWeight: "800",
      color: "#ffffff",
      textTransform: "uppercase",
      letterSpacing: 1,
      flex: 1,
    },
    cryptoSymbol: {
      fontSize: getResponsiveValue(14, 15, 16, 18),
      color: "#4a90e2",
      fontWeight: "600",
      backgroundColor: "rgba(74, 144, 226, 0.1)",
      paddingHorizontal: getResponsiveValue(8, 9, 10, 12),
      paddingVertical: getResponsiveValue(4, 5, 6, 7),
      borderRadius: getResponsiveValue(6, 7, 8, 9),
    },
    text: {
      fontSize: getResponsiveValue(16, 17, 18, 20),
      color: "#a9b7c6",
      marginBottom: getResponsiveValue(8, 9, 10, 12),
      fontWeight: "500",
      lineHeight: getResponsiveValue(22, 23, 24, 26),
    },
    priceContainer: {
      backgroundColor: "#2a2a40",
      borderRadius: getResponsiveValue(12, 13, 14, 16),
      padding: getResponsiveValue(16, 17, 18, 20),
      marginBottom: getResponsiveValue(16, 18, 20, 24),
    },
    price: {
      fontSize: getResponsiveValue(20, 22, 24, 28),
      fontWeight: "700",
      color: "#4a90e2",
      textAlign: "center",
      lineHeight: getResponsiveValue(28, 30, 32, 36),
    },
    priceLabel: {
      fontSize: getResponsiveValue(12, 13, 14, 16),
      color: "#8a8a9a",
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
      color: "#b8c5d6",
      marginBottom: getResponsiveValue(6, 7, 8, 10),
      fontWeight: "500",
    },
    ownedAmount: {
      fontSize: getResponsiveValue(18, 19, 20, 22),
      fontWeight: "700",
      color: "#ffffff",
      marginLeft: getResponsiveValue(8, 9, 10, 12),
    },
    firstInvest: {
      fontSize: getResponsiveValue(15, 16, 17, 19),
      color: "#a9b7c6",
      marginBottom: getResponsiveValue(12, 14, 16, 20),
      lineHeight: getResponsiveValue(20, 22, 24, 28),
      fontWeight: "400",
    },
    gainContainer: {
      backgroundColor: "#2a2a40",
      borderRadius: getResponsiveValue(10, 11, 12, 14),
      padding: getResponsiveValue(12, 13, 14, 16),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    gainAmount: {
      fontSize: getResponsiveValue(16, 17, 18, 20),
      fontWeight: "600",
      color: "#ffffff",
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
      color: "#8a8a9a",
      textAlign: "right",
      marginTop: getResponsiveValue(10, 13, 16, 18),
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    colorGreen: {
      color: "#27ae60",
      backgroundColor: "rgba(39, 174, 96, 0.1)",
    },
    colorRed: {
      color: "#e74c3c",
      backgroundColor: "rgba(231, 76, 60, 0.1)",
    },
    divider: {
      height: 1,
      backgroundColor: "#3a3a50",
      marginVertical: getResponsiveValue(12, 14, 16, 20),
      opacity: 0.6,
    },
    statusIndicator: {
      width: getResponsiveValue(8, 9, 10, 12),
      height: getResponsiveValue(8, 9, 10, 12),
      borderRadius: getResponsiveValue(4, 4.5, 5, 6),
      backgroundColor: "#27ae60",
      marginRight: getResponsiveValue(8, 9, 10, 12),
    },
    loadingContainer: {
      backgroundColor: "#1e1e2e",
      borderRadius: getResponsiveValue(16, 18, 20, 24),
      padding: getResponsiveValue(20, 24, 28, 32),
      marginHorizontal: getResponsiveValue(12, 16, 20, 24),
      marginVertical: getResponsiveValue(8, 10, 12, 16),
      alignItems: "center",
      justifyContent: "center",
      minHeight: getResponsiveValue(120, 130, 140, 160),
    },
    loadingText: {
      color: "#a9b7c6",
      fontSize: getResponsiveValue(16, 17, 18, 20),
      marginTop: getResponsiveValue(12, 14, 16, 20),
      fontWeight: "500",
    },
  });

  return { styles };
};
