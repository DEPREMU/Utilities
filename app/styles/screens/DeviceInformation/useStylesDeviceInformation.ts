import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesDeviceInformation = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          backgroundColor: colors.background,
        },
        title: {
          fontSize: getResponsiveValue(28, 32, 36),
          fontWeight: "bold",
          color: colors.primary,
          marginBottom: getResponsiveValue(20, 24, 28),
          textAlign: "center",
          width: "100%",
          paddingHorizontal: getResponsiveValue(16, 20, 24),
        },
        scrollContainer: {
          width: "100%",
        },
        contentContainer: {
          paddingHorizontal: getResponsiveValue(16, 20, 24),
          paddingBottom: getResponsiveValue(20, 24, 28),
          gap: getResponsiveValue(12, 16, 20),
        },
        infoCard: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.secondary,
          borderRadius: getResponsiveValue(12, 14, 16),
          padding: getResponsiveValue(16, 18, 20),
          marginBottom: getResponsiveValue(8, 10, 12),
        },
        infoSection: {
          marginBottom: getResponsiveValue(12, 16, 20),
        },
        sectionTitle: {
          fontSize: getResponsiveValue(18, 20, 22),
          fontWeight: "700",
          color: colors.accent,
          marginBottom: getResponsiveValue(8, 10, 12),
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        textKey: {
          fontSize: getResponsiveValue(16, 17, 18),
          color: colors.text,
          fontWeight: "600",
          lineHeight: getResponsiveValue(22, 24, 26),
        },
        textValue: {
          fontSize: getResponsiveValue(14, 15, 16),
          color: colors.text,
          marginLeft: getResponsiveValue(8, 10, 12),
          opacity: 0.85,
          padding: getResponsiveValue(4, 6, 8),
        },
        keyValueRow: {
          flexDirection: getResponsiveValue("column", "row", "row"),
          gap: getResponsiveValue(8, 10, 12),
          alignItems: getResponsiveValue("flex-start", "center", "center"),
          marginBottom: getResponsiveValue(8, 10, 12),
          paddingVertical: getResponsiveValue(4, 6, 8),
        },
        keyContainer: {
          flex: getResponsiveValue(1, 1.2, 1.2),
          marginRight: getResponsiveValue(0, 12, 16, 20),
          marginBottom: getResponsiveValue(0, 4, 6, 8),
        },
        valueContainer: {
          ...getCommonStyles(["mainContainer", "shadow"], {
            copyInsets: false,
          }),
          backgroundColor: colors.background,
          borderRadius: getResponsiveValue(6, 8, 10),
          flex: getResponsiveValue(undefined, 1, 1),
          alignItems: "flex-start",
          padding: getResponsiveValue(8, 12, 16),
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
          minHeight: getResponsiveValue(40, 44, 48),
        },
        highlightedValue: {
          backgroundColor: colors.accent,
          color: colors.background,
          borderRadius: getResponsiveValue(4, 5, 6),
          paddingHorizontal: getResponsiveValue(6, 8, 10),
          paddingVertical: getResponsiveValue(2, 3, 4),
        },
      }),
    [colors, getCommonStyles, getResponsiveValue],
  );

  return { styles };
};

export default useStylesDeviceInformation;
