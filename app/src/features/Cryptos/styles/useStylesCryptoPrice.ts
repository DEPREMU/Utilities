import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@/context/LayoutContext";

export const useStylesCryptoPrice = () => {
  const { getResponsiveValue, getCommonStyles } = useResponsiveLayout();
  const { text, primary, secondary, accent } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles(["shadow", "mainContainer"], {
            copyInsets: false,
          }),
          backgroundColor: secondary,
          padding: getResponsiveValue(20, 24, 28, 32),
          borderRadius: getResponsiveValue(16, 18, 20, 24),
          borderWidth: 2,
          borderColor: primary,
          minHeight: getResponsiveValue(500, 550, 600, 650),
          minWidth: 300,
        },
        cryptoHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          gap: getResponsiveValue(10, 12, 14, 16),
          alignItems: "center",
          marginBottom: getResponsiveValue(16, 18, 20, 24),
          paddingBottom: getResponsiveValue(12, 14, 16, 20),
          borderBottomWidth: 2,
          borderBottomColor: primary,
          width: "100%",
        },
        cryptoCurrency: {
          fontSize: getResponsiveValue(14, 15, 16, 18),
          fontWeight: "600",
          textAlign: "center",
          color: accent,
        },
        cryptoName: {
          fontSize: getResponsiveValue(24, 26, 28, 32),
          width: 100,
          minHeight: 30,
          maxWidth: "30%",
          fontWeight: "800",
          color: text,
          flex: 1,
          textTransform: "uppercase",
          letterSpacing: 1,
        },
        cryptoCurrencyContainer: {
          minWidth: 50,
          maxWidth: "30%",
          minHeight: 30,
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: primary,
          padding: getResponsiveValue(8, 9, 10, 12),
          borderRadius: getResponsiveValue(6, 7, 8, 9),
        },
        padding0: {
          padding: 0,
        },
        text: {
          fontSize: getResponsiveValue(16, 17, 18, 20),
          color: text,
          marginBottom: getResponsiveValue(8, 9, 10, 12),
          fontWeight: "500",
          lineHeight: getResponsiveValue(22, 23, 24, 26),
        },
        pricesContainer: {
          flexDirection: "row",
          justifyContent: "center",
          minHeight: 50,
          alignItems: "center",
          gap: getResponsiveValue(8, 9, 10, 12),
        },
        priceContainer: {
          backgroundColor: primary,
          minWidth: 200,
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
          minHeight: 20,
          textAlign: "center",
          marginBottom: getResponsiveValue(8, 9, 10, 12),
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        infoSection: {
          marginBottom: getResponsiveValue(12, 14, 16, 20),
          gap: getResponsiveValue(2, 4, 6, 8),
          width: "100%",
          alignItems: "center",
        },
        ownedText: {
          fontSize: getResponsiveValue(16, 17, 18, 20),
          color: text,
          minHeight: 20,
          minWidth: 150,
          marginBottom: getResponsiveValue(6, 7, 8, 10),
          fontWeight: "500",
          textAlign: "center",
        },
        ownedAmount: {
          fontSize: getResponsiveValue(18, 19, 20, 22),
          fontWeight: "700",
          textAlign: "center",
          minWidth: 150,
          minHeight: 25,
          color: accent,
        },
        firstInvest: {
          fontSize: getResponsiveValue(15, 16, 17, 19),
          color: text,
          minHeight: 20,
          width: "100%",
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
          width: "100%",
          minHeight: 60,
        },
        gainAmount: {
          fontSize: getResponsiveValue(16, 17, 18, 20),
          fontWeight: "600",
          color: text,
          minHeight: 20,
          minWidth: 150,
        },
        gainPercent: {
          fontSize: getResponsiveValue(18, 19, 20, 22),
          fontWeight: "800",
          minWidth: 80,
          minHeight: 20,
          textAlign: "center",
        },
        datePurchasedText: {
          fontSize: getResponsiveValue(14, 15, 16, 18),
          color: text,
          marginTop: getResponsiveValue(14, 16, 18, 20),
          textAlign: "center",
          minHeight: 25,
          width: "100%",
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
      }),
    [getResponsiveValue, accent, getCommonStyles, primary, secondary, text],
  );

  return { styles };
};
