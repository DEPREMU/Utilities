import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

/**
 * Hook to provide dynamic and theme-aware styles for SharedModeTab
 */
export const useStylesSharedModeTab = () => {
  const { colors, isLight } = useAppBehavior();
  const { getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        content: {
          paddingVertical: getResponsiveValue(12, 16, 20, 24),
          gap: getResponsiveValue(6, 8, 10, 12),
        },
        card: {
          borderRadius: getResponsiveValue(10, 12, 14, 16),
          backgroundColor: colors.secondary,
          marginHorizontal: getResponsiveValue(12, 16, 20, 24),
        },
        headerRow: {
          alignItems: "center",
          marginBottom: getResponsiveValue(8, 12, 16, 20),
          flexDirection: "row",
          justifyContent: "space-between",
        },
        title: {
          color: colors.text,
          fontWeight: "bold",
        },
        statusChip: {
          borderRadius: getResponsiveValue(12, 16, 20, 24),
        },
        statusChipOperational: {
          borderWidth: 1,
          borderColor: colors.success,
          backgroundColor: isLight ? "#E8F5E9" : "rgba(52, 211, 153, 0.15)",
        },
        statusChipMaintenance: {
          borderWidth: 1,
          borderColor: colors.error,
          backgroundColor: isLight ? "#FFEBEE" : "rgba(248, 113, 113, 0.15)",
        },
        statusTextOperational: {
          color: colors.success,
          fontWeight: "600",
        },
        statusTextMaintenance: {
          color: colors.error,
          fontWeight: "600",
        },
        overviewText: {
          color: colors.text,
          opacity: 0.85,
          lineHeight: getResponsiveValue(18, 20, 22, 24),
          marginBottom: getResponsiveValue(12, 16, 20, 24),
        },
        actionRow: {
          gap: getResponsiveValue(8, 12, 16, 20),
          marginTop: getResponsiveValue(6, 8, 10, 12),
          alignItems: "center",
          flexDirection: "row",
        },
        chatButton: {
          borderRadius: getResponsiveValue(6, 8, 10, 12),
        },
      }),
    [colors, isLight, getResponsiveValue],
  );

  return { styles, colors };
};
