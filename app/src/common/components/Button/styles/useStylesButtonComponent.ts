import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";

export const useStylesButtonComponent = () => {
  const { colors } = useAppBehavior();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          backgroundColor: colors.primary,
          padding: 10,
          borderRadius: 5,
          marginVertical: 10,
        },
        textButton: {
          color: colors.background,
          fontSize: 16,
          textAlign: "center",
          fontWeight: "bold",
        },
      }),
    [colors],
  );

  return styles;
};
