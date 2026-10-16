import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

/**
 * Hook to provide dynamic and theme-aware styles for AccountLinkCard
 */
export const useStylesAccountLinkCard = () => {
  const { colors, isLight } = useAppBehavior();
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
          marginBottom: getResponsiveValue(6, 8, 10, 12),
        },
        loginRequiredText: {
          color: colors.text,
          opacity: 0.8,
          marginBottom: getResponsiveValue(12, 16, 20, 24),
        },
        loginBtn: {
          alignSelf: "flex-start",
        },
        linkedContainer: {
          gap: getResponsiveValue(8, 12, 16, 20),
          paddingVertical: getResponsiveValue(6, 8, 10, 12),
        },
        linkedChip: {
          alignSelf: "flex-start",
        },
        quotaText: {
          color: colors.text,
          opacity: 0.85,
        },
        unlinkButton: {
          marginTop: getResponsiveValue(6, 8, 10, 12),
          borderColor: colors.error,
        },
        unlinkedContainer: {
          gap: getResponsiveValue(8, 12, 16, 20),
          paddingVertical: getResponsiveValue(2, 4, 6, 8),
        },
        description: {
          color: colors.text,
          opacity: 0.8,
        },
        codeContainer: {
          padding: getResponsiveValue(12, 16, 20, 24),
          marginTop: getResponsiveValue(6, 8, 10, 12),
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: getResponsiveValue(10, 12, 14, 16),
          backgroundColor: isLight ? "#F1F5F9" : colors.accent,
        },
        codeDisplay: {
          color: colors.success,
          fontSize: getResponsiveValue(24, 28, 32, 36),
          fontWeight: "bold",
          fontFamily: "monospace",
          marginBottom: getResponsiveValue(2, 4, 6, 8),
          letterSpacing: getResponsiveValue(2, 3, 4, 5),
        },
        timerText: {
          color: colors.error,
          fontWeight: "600",
          marginBottom: getResponsiveValue(6, 8, 10, 12),
        },
        instructionText: {
          color: colors.text,
          opacity: 0.85,
          textAlign: "center",
          marginBottom: getResponsiveValue(8, 12, 16, 20),
        },
        copyButton: {
          marginTop: getResponsiveValue(2, 4, 6, 8),
        },
        generateButton: {
          marginTop: getResponsiveValue(6, 8, 10, 12),
        },
      }),
    [colors, isLight, getResponsiveValue],
  );

  return { styles, colors };
};
