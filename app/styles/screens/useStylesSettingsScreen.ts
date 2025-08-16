import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesSettingsScreen = () => {
  const { isLargeTablet, isPhone, isTablet, isWeb, width } =
    useResponsiveLayout();

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
      backgroundColor: "#f5f5f5",
      paddingHorizontal: getResponsivePadding(),
      paddingTop: getResponsivePadding(),
      alignItems: isWeb && width > 768 ? "center" : "stretch",
    },
    contentWrapper: {
      width: getMaxWidth(),
      flex: 1,
    },
    title: {
      fontSize: getResponsiveFontSize(28),
      fontWeight: "bold",
      marginBottom: getResponsivePadding(),
      textAlign: isWeb && width > 768 ? "center" : "left",
      color: "#1a1a1a",
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
      backgroundColor: "#ffffff",
      borderRadius: 12,
      padding: getResponsivePadding(),
      marginBottom: getResponsivePadding(),
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      minHeight: 100,
    },
    subtitle: {
      fontSize: getResponsiveFontSize(20),
      fontWeight: "600",
      marginBottom: getResponsivePadding(),
      color: "#333",
    },
    inputContainer: {
      marginBottom: getResponsivePadding(),
    },
    textInput: {
      backgroundColor: "#f8f9fa",
      borderRadius: 8,
      marginBottom: getResponsivePadding() * 0.75,
    },
    buttonContainer: {
      marginTop: getResponsivePadding() * 0.5,
    },
    button: {
      borderRadius: 8,
      paddingVertical: isPhone ? 12 : 14,
      backgroundColor: "#007bff",
    },
    buttonLabel: {
      fontSize: getResponsiveFontSize(16),
      fontWeight: "600",
    },
    // Web specific styles
    ...(isWeb && {
      webContainer: {
        maxWidth: 1200,
        width: "100%",
        alignSelf: "center",
      },
    }),
    // Large screen optimizations
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
    // Export responsive values for component use
    responsiveValues: {
      padding: getResponsivePadding(),
      fontSize: getResponsiveFontSize,
      maxWidth: getMaxWidth(),
      isLargeScreen: isLargeTablet || (isWeb && width > 768),
    },
  };
};

export default useStylesSettingsScreen;
