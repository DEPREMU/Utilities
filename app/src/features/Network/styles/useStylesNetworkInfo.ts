import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@/context/LayoutContext";

export const useStylesNetworkInfo = () => {
  const { colors } = useAppBehavior();
  const { getResponsiveValue, getCommonStyles } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        containerScrollView: {
          flex: 1,
          width: "100%",
        },
        contentContainer: {
          width: "100%",
          paddingHorizontal: getResponsiveValue(16, 20, 24),
          paddingBottom: getResponsiveValue(20, 24, 28),
          gap: getResponsiveValue(12, 14, 18),
        },
        title: {
          fontSize: getResponsiveValue(26, 30, 34),
          fontWeight: "700",
          color: colors.primary,
          marginBottom: getResponsiveValue(10, 14, 18),
          textAlign: "center",
          width: "100%",
          paddingHorizontal: getResponsiveValue(16, 20, 24),
        },
        headerActions: {
          width: "100%",
          flexDirection: getResponsiveValue("column", "row", "row"),
          alignItems: getResponsiveValue("flex-start", "center", "center"),
          justifyContent: "space-between",
          paddingHorizontal: getResponsiveValue(16, 20, 24),
          marginBottom: getResponsiveValue(12, 16, 18),
          gap: getResponsiveValue(10, 12, 14),
        },
        lastUpdatedText: {
          color: colors.text,
          fontSize: getResponsiveValue(13, 14, 15),
          opacity: 0.85,
        },
        refreshButton: {
          minWidth: getResponsiveValue(120, 140, 160),
        },
        infoCard: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.secondary,
          borderRadius: getResponsiveValue(12, 14, 16),
          padding: getResponsiveValue(14, 16, 20),
        },
        sectionTitle: {
          color: colors.primary,
          fontSize: getResponsiveValue(18, 20, 22),
          fontWeight: "700",
          marginBottom: getResponsiveValue(10, 12, 14),
        },
        keyValueRow: {
          marginBottom: getResponsiveValue(8, 10, 12),
          gap: getResponsiveValue(6, 8, 10),
        },
        textKey: {
          color: colors.text,
          fontSize: getResponsiveValue(14, 15, 16),
          fontWeight: "600",
        },
        valueContainer: {
          ...getCommonStyles("shadow").shadow,
          ...getCommonStyles("container").container,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
          borderRadius: getResponsiveValue(8, 10, 12),
          padding: getResponsiveValue(10, 12, 14),
          backgroundColor: colors.background,
        },
        textValue: {
          color: colors.text,
          fontSize: getResponsiveValue(13, 14, 15),
          opacity: 0.9,
        },
        emptyState: {
          color: colors.text,
          textAlign: "center",
          opacity: 0.75,
          paddingVertical: getResponsiveValue(8, 10, 12),
        },
        ...getCommonStyles("container"),
      }),
    [colors, getCommonStyles, getResponsiveValue],
  );

  return { styles };
};
