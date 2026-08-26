import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesCalculator = () => {
  const { colors } = useAppBehavior();
  const { getResponsiveValue, getCommonStyles, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          width: "100%",
          backgroundColor: colors.secondary,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        },
        input: {
          fontSize: getResponsiveValue(16, 20, 24),
          fontWeight: "500",
          color: colors.text,
          textAlign: "right",
          marginBottom: 8,
        },
        result: {
          fontSize: getResponsiveValue(24, 32, 40),
          fontWeight: "bold",
          color: colors.text,
          textAlign: "right",
        },
        inputsCalculator: {
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 8,
          gap: 12,
        },
        row: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          marginBottom: 12,
        },
        buttonInput: {
          ...getCommonStyles("shadow").shadow,
          flex: 1,
          marginHorizontal: 4,
          backgroundColor: colors.secondary,
          minHeight: 50,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
        },
        ...texts,
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
      }),
    [colors, getResponsiveValue, getCommonStyles, texts],
  );

  return { styles };
};
