import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";
import { useMemo } from "react";

const useStylesDeviceInformation = () => {
  const { colors } = useTheme();
  const { getCommonStyles } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          backgroundColor: colors.background,
        },
        title: {
          fontSize: 24,
          fontWeight: "bold",
          color: colors.text,
          marginBottom: 12,
        },
        contentContainer: {
          padding: 12,
        },
        textKey: {
          fontSize: 16,
          color: colors.text,
          fontWeight: "600",
        },
        textValue: {
          fontSize: 14,
          color: colors.text,
          marginBottom: 8,
        },
      }),
    [colors, getCommonStyles],
  );

  return { styles };
};

export default useStylesDeviceInformation;
