import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesCryptoItem = () => {
  const theme = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();
  const { primary, secondary, background, text, shadow } = theme;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        padding0: {
          padding: 0,
        },
        text: {
          fontSize: getResponsiveValue(16, 17, 18, 20),
          padding: getResponsiveValue(8, 9, 10, 12),
          color: text,
          fontWeight: "700",
          marginLeft: getResponsiveValue(12, 14, 16, 18),
          letterSpacing: 0.3,
        },
        inputAmount: {
          backgroundColor: background,
          color: text,
          fontSize: getResponsiveValue(16, 17, 18, 20),
          textAlign: "center",
          borderColor: primary,
          borderWidth: 2,
          borderRadius: getResponsiveValue(10, 11, 12, 14),
          ...getCommonStyles("shadow"),
        },
        checkBoxRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          padding: getResponsiveValue(8, 16, 20, 24),
          backgroundColor: secondary,
          borderRadius: getResponsiveValue(12, 14, 16, 18),
          marginVertical: getResponsiveValue(6, 7, 8, 10),
          shadowColor: shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 6,
          borderWidth: 2,
          borderColor: primary,
          minHeight: getResponsiveValue(60, 65, 70, 80),
        },
      }),
    [
      text,
      shadow,
      primary,
      secondary,
      background,
      getCommonStyles,
      getResponsiveValue,
    ],
  );
  return { styles, ...theme };
};

export default useStylesCryptoItem;
