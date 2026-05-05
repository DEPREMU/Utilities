import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@/context/LayoutContext";

export const useStylesTerminalCommands = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        mainContainer: {
          ...getCommonStyles("container").container,
          alignSelf: "center",
          alignItems: undefined,
          maxWidth: 800,
        },
        container: {
          flex: 1,
          backgroundColor: colors.background,
          width: "100%",
        },
        scrollContent: {
          flexGrow: 1,
          paddingBottom: getResponsiveValue(20, 30, 40),
        },
        title: {
          marginBottom: getResponsiveValue(20, 30, 40),
          color: colors.text,
          textAlign: "center",
          fontWeight: "bold",
        },
        card: {
          backgroundColor: colors.secondary,
          marginBottom: getResponsiveValue(20, 30, 40),
          width: "90%",
          maxWidth: 600,
          alignSelf: "center",
          borderRadius: 16,
          ...getCommonStyles("shadow").shadow,
        },
        cardContent: {
          padding: getResponsiveValue(16, 20, 24),
        },
        input: {
          backgroundColor: colors.background,
          marginBottom: getResponsiveValue(12, 16, 20),
          width: "100%",
          borderRadius: 8,
        },
        switchRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: getResponsiveValue(8, 12, 16),
          paddingHorizontal: getResponsiveValue(12, 16, 20),
          backgroundColor: colors.background,
          borderRadius: 8,
          marginBottom: getResponsiveValue(12, 16, 20),
        },
        switchLabel: {
          color: colors.text,
          fontSize: getResponsiveValue(14, 16, 18),
          fontWeight: "500",
        },
        addButton: {
          backgroundColor: colors.accent,
          borderRadius: 8,
          paddingVertical: getResponsiveValue(12, 14, 16),
          justifyContent: "center",
          alignItems: "center",
        },
        addButtonLabel: {
          color: colors.background,
          fontWeight: "bold",
          fontSize: getResponsiveValue(14, 16, 18),
        },
        listContainer: {
          gap: getResponsiveValue(12, 16, 20),
          width: "90%",
          maxWidth: 600,
          alignSelf: "center",
          paddingBottom: getResponsiveValue(20, 30, 40),
        },
        commandCard: {
          backgroundColor: colors.secondary,
          borderRadius: 16,
          width: "100%",
          overflow: "hidden",
          ...getCommonStyles("shadow").shadow,
        },
        commandCardContent: {
          padding: getResponsiveValue(16, 20, 24),
        },
        commandHeader: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: getResponsiveValue(8, 10, 12),
        },
        commandBadge: {
          backgroundColor: colors.primary,
          paddingHorizontal: getResponsiveValue(12, 14, 16),
          paddingVertical: getResponsiveValue(6, 8, 10),
          borderRadius: 20,
          ...getCommonStyles("shadow").shadow,
        },
        commandBadgeText: {
          color: colors.background,
          fontWeight: "bold",
          fontSize: getResponsiveValue(12, 13, 14),
        },
        commandTextContainer: {
          backgroundColor: colors.background,
          padding: getResponsiveValue(12, 14, 16),
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: colors.accent,
          marginTop: getResponsiveValue(8, 10, 12),
        },
        commandText: {
          color: colors.text,
          fontSize: getResponsiveValue(13, 14, 15),
          fontFamily: "monospace",
        },
        emptyContainer: {
          flex: 1,
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          padding: getResponsiveValue(40, 60, 80),
        },
        emptyCard: {
          backgroundColor: colors.secondary,
          padding: getResponsiveValue(30, 40, 50),
          borderRadius: 20,
          alignItems: "center",
          width: "90%",
          maxWidth: 400,
          ...getCommonStyles("shadow").shadow,
        },
        emptyText: {
          color: colors.text,
          fontSize: getResponsiveValue(16, 18, 20),
          textAlign: "center",
          marginTop: getResponsiveValue(12, 16, 20),
        },
        iconContainer: {
          width: getResponsiveValue(60, 70, 80),
          height: getResponsiveValue(60, 70, 80),
          borderRadius: getResponsiveValue(30, 35, 40),
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        },
        deleteButton: {
          position: "absolute",
          top: getResponsiveValue(8, 10, 12),
          right: getResponsiveValue(8, 10, 12),
          margin: 0,
        },
        deleteButtonIcon: {
          backgroundColor: colors.error,
          borderRadius: 20,
        },
        executeButton: {
          backgroundColor: colors.accent,
          borderRadius: 8,
          padding: getResponsiveValue(12, 14, 16),
          justifyContent: "center",
          alignItems: "center",
          marginTop: getResponsiveValue(10, 12, 14),
        },
        executeButtonLabel: {
          color: colors.background,
          fontWeight: "bold",
          fontSize: getResponsiveValue(14, 16, 18),
        },
        cancelButton: {
          backgroundColor: colors.error,
          borderRadius: 8,
          paddingVertical: getResponsiveValue(12, 14, 16),
          justifyContent: "center",
          alignItems: "center",
          marginTop: getResponsiveValue(10, 12, 14),
        },
        cancelButtonLabel: {
          color: colors.background,
          fontWeight: "bold",
          fontSize: getResponsiveValue(14, 16, 18),
        },
      }),
    [colors, getCommonStyles, getResponsiveValue],
  );

  return { styles, colors };
};
