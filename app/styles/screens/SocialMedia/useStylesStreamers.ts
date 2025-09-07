import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet, TextStyle } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesStreamers = () => {
  const colors = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const liveStreamer = useMemo(
    () =>
      ({
        fontSize: getResponsiveValue(14, 16, 18, 20),
        fontWeight: "600",
        color: colors.text,
        minWidth: 80,
        textAlign: "center",
        paddingHorizontal: getResponsiveValue(12, 16, 20, 24),
        paddingVertical: getResponsiveValue(6, 8, 10, 12),
        borderRadius: getResponsiveValue(8, 10, 12, 14),
        borderWidth: 1,
        borderColor: colors.accent,
        letterSpacing: 0.3,
      }) as TextStyle,
    [colors, getResponsiveValue],
  );

  const buttonStyle = useMemo(
    () =>
      ({
        ...getCommonStyles("shadow"),
        borderRadius: getResponsiveValue(8, 10, 12, 14),
        paddingHorizontal: getResponsiveValue(12, 16, 20, 24),
        paddingVertical: getResponsiveValue(8, 10, 12, 14),
        borderWidth: 1,
        borderColor: colors.primary,
        minWidth: getResponsiveValue(70, 80, 90, 100),
      }) as TextStyle,
    [colors, getCommonStyles, getResponsiveValue],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          backgroundColor: colors.background,
          padding: getResponsiveValue(20, 24, 28, 32),
          alignItems: "center",
        },
        title: {
          fontSize: getResponsiveValue(28, 32, 36, 40),
          fontWeight: "800",
          color: colors.primary,
          textAlign: "center",
          marginBottom: getResponsiveValue(24, 30, 36, 42),
          letterSpacing: 1,
          textShadowColor: colors.shadow + "30",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        },
        containerAdd: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: getResponsiveValue(24, 30, 36, 42),
          width: "100%",
          maxWidth: 500,
          gap: getResponsiveValue(12, 16, 20, 24),
        },
        textInput: {
          flex: 1,
          backgroundColor: colors.secondary,
          fontSize: getResponsiveValue(14, 16, 18, 20),
          maxHeight: getResponsiveValue(50, 55, 60, 65),
        },
        buttonAdd: {
          backgroundColor: colors.primary,
          borderRadius: getResponsiveValue(12, 16, 20, 24),
          paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
          paddingVertical: getResponsiveValue(12, 16, 20, 24),
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 6,
          borderWidth: 1,
          borderColor: colors.accent,
          minWidth: getResponsiveValue(100, 120, 140, 160),
        },
        textButton: {
          fontSize: getResponsiveValue(14, 16, 18, 20),
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
          letterSpacing: 0.5,
        },
        yourStreamers: {
          fontSize: getResponsiveValue(20, 24, 28, 32),
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
          marginBottom: getResponsiveValue(20, 24, 28, 32),
          letterSpacing: 0.5,
        },
        containerScrollView: {
          flex: 1,
          width: "100%",
        },
        contentContainer: {
          padding: getResponsiveValue(16, 20, 24, 28),
          gap: getResponsiveValue(16, 20, 24, 28),
          alignItems: "center",
        },
        containerStreamer: {
          width: "100%",
          maxWidth: 500,
          backgroundColor: colors.secondary,
          borderRadius: getResponsiveValue(16, 20, 24, 28),
          padding: getResponsiveValue(16, 20, 24, 28),
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          borderWidth: 1,
          borderColor: colors.primary,
        },
        containerImageAndName: {
          alignItems: "center",
          justifyContent: "center",
          marginBottom: getResponsiveValue(12, 16, 20, 24),
        },
        streamerImage: {
          width: getResponsiveValue(80, 90, 100, 110),
          height: getResponsiveValue(80, 90, 100, 110),
          marginBottom: getResponsiveValue(8, 12, 16, 20),
        },
        nameStreamer: {
          fontSize: getResponsiveValue(18, 20, 22, 24),
          fontWeight: "700",
          color: colors.text,
          textAlign: "center",
          letterSpacing: 0.5,
        },
        containerData: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        },
        isLiveStreamer: {
          ...liveStreamer,
          backgroundColor: colors.success,
        },
        isNotLiveStreamer: {
          ...liveStreamer,
          backgroundColor: colors.error,
        },
        containerButtons: {
          flexDirection: "row",
          gap: getResponsiveValue(8, 12, 16, 20),
          alignItems: "center",
        },
        buttonVisit: {
          ...buttonStyle,
          backgroundColor: colors.secondary,
        },
        buttonDelete: {
          ...buttonStyle,
          backgroundColor: colors.error,
        },
        notificationsContainer: {
          ...getCommonStyles("shadow"),
          marginVertical: getResponsiveValue(16, 20, 24, 28),
          padding: getResponsiveValue(12, 16, 20, 24),
          alignItems: "center",
          justifyContent: "space-between",
          flexDirection: "row",
        },
        notificationsTitle: {
          fontSize: getResponsiveValue(16, 18, 20, 22),
          fontWeight: "700",
          color: colors.text,
          letterSpacing: 0.5,
        },
      }),
    [colors, getCommonStyles, getResponsiveValue, liveStreamer, buttonStyle],
  );

  return { styles };
};
