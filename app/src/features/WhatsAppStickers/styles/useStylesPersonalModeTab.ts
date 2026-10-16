import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

/**
 * Hook to provide dynamic and theme-aware styles for PersonalModeTab
 */
export const useStylesPersonalModeTab = () => {
  const { colors } = useAppBehavior();
  const { getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          padding: getResponsiveValue(12, 16, 20, 24),
        },
        card: {
          marginBottom: getResponsiveValue(12, 16, 20, 24),
          borderRadius: getResponsiveValue(10, 12, 14, 16),
          backgroundColor: colors.secondary,
        },
        captionText: {
          color: colors.text,
          opacity: 0.8,
          marginVertical: getResponsiveValue(6, 8, 10, 12),
        },
        buttonRow: {
          gap: getResponsiveValue(6, 8, 10, 12),
          flexWrap: "wrap",
          marginTop: getResponsiveValue(12, 16, 20, 24),
          flexDirection: "row",
        },
        actionBtn: {
          marginRight: getResponsiveValue(6, 8, 10, 12),
        },
        switchRow: {
          marginTop: getResponsiveValue(16, 20, 24, 28),
          alignItems: "center",
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          justifyContent: "space-between",
          paddingVertical: getResponsiveValue(6, 8, 10, 12),
        },
        modalContent: {
          margin: getResponsiveValue(16, 20, 24, 28),
          padding: getResponsiveValue(16, 20, 24, 28),
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: getResponsiveValue(10, 12, 14, 16),
          backgroundColor: colors.secondary,
        },
        qrTitle: {
          color: colors.text,
          textAlign: "center",
          marginBottom: getResponsiveValue(12, 16, 20, 24),
        },
        qrImage: {
          width: getResponsiveValue(200, 240, 260, 300),
          height: getResponsiveValue(200, 240, 260, 300),
        },
        qrLoader: {
          marginVertical: getResponsiveValue(24, 32, 40, 48),
        },
        cancelBtn: {
          marginTop: getResponsiveValue(12, 16, 20, 24),
        },
      }),
    [colors, getResponsiveValue],
  );

  return { styles, colors };
};
