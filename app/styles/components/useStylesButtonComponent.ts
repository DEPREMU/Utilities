import { StyleSheet } from "react-native";
import { useColors } from "@hooks/useColors";

export const useStylesButtonComponent = () => {
  const { primary, background } = useColors();

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
