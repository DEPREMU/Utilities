import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import { useMemo } from "react";

const useStylesNotifications = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("shadow"),
          padding: getResponsiveValue(16, 20, 24),
          maxHeight: 400,
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
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles };
};

export default useStylesNotifications;
