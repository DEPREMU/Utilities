import { useResponsiveLayout } from "@context/LayoutContext";
import { StatusBar, StyleSheet } from "react-native";

export const useStylesModalComponent = () => {
  const { height, width, isPhone } = useResponsiveLayout();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      width: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      position: "absolute",
      zIndex: 1000,
      left: 0,
      top: 0,
      height: height + (StatusBar?.currentHeight || 0),
      cursor: "auto",
    },
    modal: {
      backgroundColor: "#fff",
      cursor: "auto",
      borderRadius: 8,
      width: "90%",
      maxWidth: isPhone ? "90%" : 500,
      padding: 20,
      elevation: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      gap: isPhone ? 10 : 20,
    },
    title: {
      fontWeight: "bold",
      fontSize: isPhone ? 18 : 24,
      borderRadius: 8,
      padding: isPhone ? 10 : 0,
      textAlign: "center",
    },
    body: {
      paddingHorizontal: isPhone ? 10 : 20,
      borderRadius: 8,
      width: "100%",
      maxWidth: "100%",
      overflow: "hidden",
    },
    buttons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      paddingVertical: isPhone ? 10 : 0,
      alignItems: "center",
      paddingHorizontal: isPhone ? 10 : 20,
      gap: 10,
      borderRadius: 8,
    },
    messageText: {
      paddingHorizontal: isPhone ? 10 : 20,
      borderRadius: 8,
      padding: isPhone ? 10 : 0,
      fontSize: isPhone ? 14 : 18,
      textAlign: "center",
    },
  });

  return { styles, height, width };
};
