import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import { useColors } from "@hooks/useColors";

const useStylesSettingsScreen = () => {
  const { isLargeTablet, isPhone, isTablet, isWeb, width } =
    useResponsiveLayout();
  const { background, text, primary, secondary, shadow, accent } = useColors();

  // Responsive sizing calculations
  const getResponsivePadding = () => {
    if (isPhone) return 16;
    if (isTablet) return 24;
    if (isLargeTablet) return 32;
    return isWeb ? Math.min(width * 0.05, 48) : 20;
  };

  const getResponsiveFontSize = (baseSize: number) => {
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
  };

  const getMaxWidth = () => {
    if (isWeb && width > 768) return 600;
    if (isLargeTablet) return width * 0.8;
    return "100%";
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: background,
      paddingHorizontal: getResponsivePadding(),
      paddingTop: getResponsivePadding(),
      alignItems: isWeb && width > 768 ? "center" : "stretch",
    },
    contentWrapper: {
      width: getMaxWidth(),
      flex: 1,
    },
    title: {
      fontSize: getResponsiveFontSize(32),
      fontWeight: "bold",
      marginBottom: getResponsivePadding(),
      textAlign: isWeb && width > 768 ? "center" : "center",
      color: primary,
      letterSpacing: 0.5,
    },
    scrollView: {
      flex: 1,
    },
    scrollViewContent: {
      paddingBottom: getResponsivePadding() * 2,
      justifyContent: "flex-start",
      gap: 15,
    },
    section: {
      backgroundColor: secondary,
      borderRadius: 16,
      padding: getResponsivePadding(),
      marginBottom: getResponsivePadding(),
      shadowColor: shadow,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
      minHeight: 100,
      borderWidth: 2,
      borderColor: accent,
    },
    subtitle: {
      fontSize: getResponsiveFontSize(22),
      fontWeight: "700",
      marginBottom: getResponsivePadding(),
      color: text,
      textAlign: "center",
      letterSpacing: 0.3,
    },
    inputContainer: {
      marginBottom: getResponsivePadding(),
    },
    textInput: {
      backgroundColor: background,
      borderRadius: 12,
      marginBottom: getResponsivePadding() * 0.75,
      borderWidth: 2,
      borderColor: accent,
    },
    buttonContainer: {
      marginTop: getResponsivePadding() * 0.5,
    },
    button: {
      borderRadius: 12,
      paddingVertical: isPhone ? 14 : 16,
      backgroundColor: primary,
      elevation: 3,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    buttonLabel: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: "600",
      letterSpacing: 0.3,
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
        gap: getResponsivePadding(),
      },
      columnSection: {
        flex: 1,
        minWidth: 300,
      },
    }),
  });

  return {
    styles,
    responsiveValues: {
      padding: getResponsivePadding(),
      fontSize: getResponsiveFontSize,
      maxWidth: getMaxWidth(),
      isLargeScreen: isLargeTablet || (isWeb && width > 768),
    },
  };
};

export default useStylesSettingsScreen;
