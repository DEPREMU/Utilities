import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@/context/LayoutContext";
import { useCallback, useMemo } from "react";

const useStylesSettingsScreen = () => {
  const {
    width,
    isWeb,
    isPhone,
    isTablet,
    isLargeTablet,
    getCommonStyles,
    getResponsiveValue,
  } = useResponsiveLayout();
  const { colors } = useAppBehavior();

  const getResponsiveFontSize = useCallback(
    (baseSize: number) => {
      const multiplier = isPhone
        ? 1
        : isTablet
          ? 1.1
          : isLargeTablet
            ? 1.2
            : isWeb
              ? 1.15
              : 1;
      return baseSize * multiplier;
    },
    [isPhone, isTablet, isLargeTablet, isWeb],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("container").container,
          alignItems: getResponsiveValue("center", "center", "stretch"),
        },
        contentWrapper: {
          width: getResponsiveValue("95%", "90%", "80%"),
          flex: 1,
        },
        title: {
          fontSize: getResponsiveFontSize(32),
          fontWeight: "bold",
          marginBottom: getResponsiveValue(20, 24, 28),
          textAlign: "center",
          color: colors.primary,
          letterSpacing: 0.5,
        },
        scrollView: {
          flex: 1,
        },
        scrollViewContent: {
          paddingBottom: getResponsiveValue(16, 20, 24),
          justifyContent: "flex-start",
          gap: 15,
        },
        section: {
          backgroundColor: colors.secondary,
          borderRadius: 16,
          padding: getResponsiveValue(12, 16, 20),
          marginBottom: getResponsiveValue(12, 16, 20),
          shadowColor: colors.shadow,
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 4,
          minHeight: 100,
          borderWidth: 2,
          borderColor: colors.accent,
        },
        subtitle: {
          fontSize: getResponsiveFontSize(22),
          fontWeight: "700",
          marginBottom: getResponsiveValue(12, 16, 20),
          color: colors.text,
          textAlign: "center",
          letterSpacing: 0.3,
        },
        infoText: {
          fontSize: getResponsiveFontSize(14),
          color: colors.text,
          textAlign: "center",
          marginBottom: getResponsiveValue(12, 16, 20),
          letterSpacing: 0.2,
        },
        inputContainer: {
          marginBottom: getResponsiveValue(12, 16, 20),
        },
        buttonContainer: {
          marginTop: getResponsiveValue(12, 16, 20),
        },
        button: {
          borderRadius: 12,
          paddingVertical: getResponsiveValue(10, 12, 14),
          backgroundColor: colors.primary,
          elevation: 3,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        buttonLabel: {
          fontSize: getResponsiveFontSize(16),
          fontWeight: "600",
          letterSpacing: 0.3,
          textAlign: "center",
          color: colors.background,
        },
        ...(isWeb && {
          webContainer: {
            maxWidth: 1200,
            width: "100%",
            alignSelf: "center",
          },
        }),
        ...(isLargeTablet && {
          twoColumnLayout: {
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 20,
          },
          columnSection: {
            flex: 1,
            minWidth: 300,
          },
          dateText: {
            fontSize: getResponsiveFontSize(18),
            color: colors.text,
            textAlign: "center",
          },
          activityIndicator: {
            marginVertical: 6,
          },
        }),
      }),
    [
      colors,
      getCommonStyles,
      getResponsiveValue,
      getResponsiveFontSize,
      isLargeTablet,
      isWeb,
    ],
  );

  return {
    styles,
    responsiveValues: {
      padding: getResponsiveValue(12, 16, 20),
      fontSize: getResponsiveFontSize,
      maxWidth: getResponsiveValue("95%", "90%", "80%"),
      isLargeScreen: isLargeTablet || (isWeb && width > 768),
    },
    colors,
  };
};

export default useStylesSettingsScreen;
