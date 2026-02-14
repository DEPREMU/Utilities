import { StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export const useStylesButtonComponent = () => {
  const { primary, background } = useTheme();

  return StyleSheet.create({
    button: {
      backgroundColor: primary,
      padding: 10,
      borderRadius: 5,
      marginVertical: 10,
    },
    textButton: {
      color: background,
      fontSize: 16,
      textAlign: "center",
      fontWeight: "bold",
    },
  });
};
