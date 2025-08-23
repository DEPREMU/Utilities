import { useResponsiveLayout } from "@context/LayoutContext";
import { StatusBar, StyleSheet } from "react-native";
import { useTheme } from "@context/ThemeContext";
export const useStylesModalComponent = () => {
  const { height, width, isPhone, getCommonStyles } = useResponsiveLayout();
  const { background, text, border, primary, overlay } = useTheme();

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      width: "100%",
      backgroundColor: overlay,
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
      ...getCommonStyles("shadow"),
      backgroundColor: background,
      cursor: "auto",
      borderRadius: 8,
      width: "90%",
      maxWidth: isPhone ? "90%" : 500,
      padding: 20,
      gap: isPhone ? 10 : 20,
      borderWidth: 1,
      borderColor: border,
    },
    title: {
      fontWeight: "bold",
      fontSize: isPhone ? 18 : 24,
      borderRadius: 8,
      padding: isPhone ? 10 : 0,
      textAlign: "center",
      color: primary,
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
      color: text,
    },
  });

  return { styles, height, width };
};
