import useColors from "@hooks/useColors";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesNotifications = () => {
  const { primary, secondary, text, shadow, accent, background } = useColors();
  const { isPhone, isWeb, isTablet } = useResponsiveLayout();

  const styles = StyleSheet.create({
    container: {
      padding: isPhone ? 16 : 20,
      maxHeight: 400,
      width: "100%",
      backgroundColor: background,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: accent,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    contentContainer: {
      paddingBottom: isPhone ? 20 : 30,
      gap: 12,
    },
    title: {
      fontSize: isTablet ? 20 : 26,
      fontWeight: "800",
      marginBottom: 16,
      color: primary,
      textAlign: "center",
      letterSpacing: 0.5,
    },
    notificationItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: secondary,
      borderRadius: 12,
      marginVertical: 4,
      borderWidth: 1,
      borderColor: primary,
      shadowColor: shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      flexWrap: "wrap",
      minHeight: 60,
    },
    notificationKey: {
      flex: 1,
      fontSize: isPhone ? 16 : 18,
      fontWeight: "600",
      color: text,
      textAlign: isWeb ? "left" : "center",
      marginHorizontal: 8,
      letterSpacing: 0.3,
    },
    notificationInput: {
      minWidth: isWeb ? 120 : 100,
      backgroundColor: background,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: accent,
      fontSize: isPhone ? 14 : 16,
    },
  });

  return { styles };
};

export default useStylesNotifications;
