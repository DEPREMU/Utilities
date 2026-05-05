import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesNotifications = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        containerFlatList: {
          ...getCommonStyles("shadow"),
          padding: getResponsiveValue(16, 20, 24),
          width: "100%",
          backgroundColor: colors.background,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: colors.accent,
        },
        contentContainer: {
          paddingBottom: getResponsiveValue(20, 25, 30),
          gap: 12,
        },
        title: {
          fontSize: getResponsiveValue(20, 26, 30),
          fontWeight: "800",
          marginBottom: 16,
          color: colors.primary,
          textAlign: "center",
          letterSpacing: 0.5,
        },
        notificationItem: {
          ...getCommonStyles("shadow"),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          paddingVertical: 16,
          paddingHorizontal: 16,
          backgroundColor: colors.secondary,
          borderRadius: 12,
          marginVertical: 4,
          borderWidth: 1,
          borderColor: colors.primary,
          gap: 8,
          flexWrap: "wrap",
          minHeight: 60,
        },
        notificationKey: {
          flex: 1,
          fontSize: getResponsiveValue(16, 18, 20),
          fontWeight: "600",
          color: colors.text,
          textAlign: getResponsiveValue("left", "center", "center"),
          marginHorizontal: 8,
          letterSpacing: 0.3,
        },
        notificationInput: {
          minWidth: getResponsiveValue(120, 100, 100),
          backgroundColor: colors.background,
          width: "100%",
          borderRadius: 8,
          borderWidth: 2,
          borderColor: colors.accent,
          fontSize: getResponsiveValue(14, 16, 16),
        },
        detailsContainer: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.background,
          borderRadius: 12,
          padding: 12,
          gap: 8,
          borderWidth: 1,
          borderColor: colors.accent,
        },
        detailRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        },
        detailLabel: {
          color: colors.text,
          fontSize: getResponsiveValue(13, 14, 14),
          fontWeight: "600",
          flex: 1,
        },
        detailValue: {
          color: colors.primary,
          fontSize: getResponsiveValue(13, 14, 14),
          fontWeight: "500",
          textAlign: "right",
          flex: 1,
        },
        detailSection: {
          marginTop: 4,
          gap: 8,
        },
        detailSectionTitle: {
          color: colors.primary,
          fontSize: getResponsiveValue(14, 16, 16),
          fontWeight: "700",
        },
        detailInput: {
          flex: 1,
          minWidth: getResponsiveValue(120, 120, 140),
          backgroundColor: colors.background,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: colors.accent,
          fontSize: getResponsiveValue(13, 14, 14),
        },
        containerNotificationItem: {
          width: "100%",
          ...getCommonStyles("shadow"),
          borderRadius: 16,
          borderWidth: 2,
          borderColor: colors.accent,
          backgroundColor: colors.secondary,
          padding: 12,
          marginBottom: 12,
        },
        ...getCommonStyles("container"),
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles };
};
