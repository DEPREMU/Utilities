import { useTheme } from "@/context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import { useMemo } from "react";

const useStylesCalculator = () => {
  const theme = useTheme();
  const { isLargeTablet, isTablet, getCommonStyles } = useResponsiveLayout();
  const { secondary, text, background } = theme;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer", { fallbackValues: [16] }),
          backgroundColor: background,
        },
        header: {
          width: "100%",
          backgroundColor: secondary,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        },
        scrollView: {
          width: "100%",
          height: 100,
        },
        scrollViewContent: {
          justifyContent: "center",
          alignItems: "flex-end",
        },
        input: {
          fontSize: isTablet || isLargeTablet ? 24 : 20,
          fontWeight: "500",
          color: text,
          textAlign: "right",
          marginBottom: 8,
        },
        result: {
          fontSize: isTablet || isLargeTablet ? 32 : 24,
          fontWeight: "bold",
          color: text,
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
          ...getCommonStyles("shadow"),
          flex: 1,
          marginHorizontal: 4,
          backgroundColor: secondary,
          minHeight: 50,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
        },
        buttonText: {
          color: text,
          fontSize: isTablet || isLargeTablet ? 20 : 16,
          fontWeight: "bold",
        },
      }),
    [secondary, text, background, isTablet, isLargeTablet, getCommonStyles],
  );

  return { styles, ...theme };
};

export default useStylesCalculator;
