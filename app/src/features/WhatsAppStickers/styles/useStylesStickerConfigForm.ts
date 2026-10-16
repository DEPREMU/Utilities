import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

/**
 * Hook to provide dynamic and theme-aware styles for StickerConfigForm
 */
export const useStylesStickerConfigForm = () => {
  const { colors } = useAppBehavior();
  const { getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: getResponsiveValue(10, 12, 14, 16),
          marginVertical: getResponsiveValue(6, 8, 10, 12),
          backgroundColor: colors.secondary,
          marginHorizontal: getResponsiveValue(12, 16, 20, 24),
        },
        cardTitle: {
          color: colors.text,
          fontWeight: "bold",
          marginBottom: getResponsiveValue(12, 16, 20, 24),
        },
        switchRow: {
          alignItems: "center",
          marginBottom: getResponsiveValue(12, 16, 20, 24),
          flexDirection: "row",
          justifyContent: "space-between",
        },
        input: {
          marginBottom: getResponsiveValue(10, 12, 14, 16),
        },
        segmentedContainer: {
          marginVertical: getResponsiveValue(6, 8, 10, 12),
        },
        segmentLabel: {
          color: colors.text,
          opacity: 0.75,
          marginBottom: getResponsiveValue(4, 6, 8, 10),
        },
        saveButton: {
          marginTop: getResponsiveValue(10, 12, 14, 16),
        },
      }),
    [colors, getResponsiveValue],
  );

  return { styles, colors };
};
