import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";

export const useStylesButtonComponent = () => {
  const { primary, background } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
      }),
    [primary, background],
  );

  return styles;
};
