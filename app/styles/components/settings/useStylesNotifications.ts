import useColors from "@hooks/useColors";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesNotifications = () => {
  const { border } = useColors();
  const { isPhone, isWeb, isTablet } = useResponsiveLayout();

  const styles = StyleSheet.create({
    container: {
      padding: isTablet ? 12 : 24,
      maxHeight: 300,
      width: isWeb ? "100%" : "95%",
    },
    contentContainer: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      paddingBottom: isPhone ? 20 : 30,
    },
    title: {
      fontSize: isTablet ? 18 : 24,
      fontWeight: "bold",
      marginBottom: 12,
    },
    notificationItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      flexWrap: "wrap",
      flex: 1,
      borderBottomColor: border,
      justifyContent: "space-between",
      maxWidth: isWeb ? 600 : "95%",
    },
    notificationKey: {
      paddingHorizontal: 12,
      minWidth: isWeb ? 200 : "50%",
      textAlign: "center",
    },
    notificationInput: {
      paddingHorizontal: 12,
      minWidth: isWeb ? 200 : "50%",
      textAlign: "center",
    },
  });

  return { styles };
};

export default useStylesNotifications;
