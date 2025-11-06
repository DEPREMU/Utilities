import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@/context/LayoutContext";

const useStylesComputerControl = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          backgroundColor: colors.background,
          padding: getResponsiveValue(12, 18, 24),
          flex: 1,
        },
        title: {
          color: colors.text,
          textAlign: "center",
          fontWeight: "bold",
          fontSize: getResponsiveValue(20, 22, 24),
          marginBottom: getResponsiveValue(16, 20, 24),
        },
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          marginTop: getResponsiveValue(20, 30, 40),
        },
        loadingText: {
          marginTop: getResponsiveValue(10, 12, 14),
          color: colors.secondary,
          fontSize: getResponsiveValue(14, 16, 18),
        },
        emptyText: {
          textAlign: "center",
          marginTop: getResponsiveValue(30, 40, 50),
          color: colors.border,
          fontSize: getResponsiveValue(14, 16, 18),
        },
        deviceCard: {
          backgroundColor: colors.overlay,
          borderRadius: 12,
          marginVertical: getResponsiveValue(6, 8, 10),
          paddingVertical: getResponsiveValue(8, 10, 12),
          paddingHorizontal: getResponsiveValue(10, 12, 14),
          ...getCommonStyles("shadow", { shadowColor: colors.shadow }),
        },
        deviceItemTitle: {
          color: colors.text,
          fontWeight: "600",
          fontSize: getResponsiveValue(16, 18, 20),
        },
        deviceItemDescription: {
          color: colors.secondary,
          fontSize: getResponsiveValue(12, 14, 16),
        },
        fab: {
          position: "absolute",
          bottom: getResponsiveValue(20, 30, 40),
          right: getResponsiveValue(20, 30, 40),
          backgroundColor: colors.primary,
          borderRadius: 28,
          paddingHorizontal: getResponsiveValue(16, 20, 24),
        },
        listIconPower: {
          color: colors.error,
        },
        listIconRestart: {
          color: colors.primary,
        },
        listIconDevice: {
          color: colors.accent,
        },
      }),
    [getCommonStyles, colors, getResponsiveValue],
  );

  return { styles, colors };
};

export default useStylesComputerControl;
