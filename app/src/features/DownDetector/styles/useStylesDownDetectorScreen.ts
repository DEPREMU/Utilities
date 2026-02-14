import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useResponsiveLayout } from "@/context/LayoutContext";
import { DimensionValue, StyleSheet } from "react-native";

const useStylesDownDetectorScreen = () => {
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          maxWidth: 1000,
          alignSelf: "center",
        },
        containerFlatList: {
          flex: 1,
          width: "100%",
        },
        contentContainer: {
          padding: getResponsiveValue(8, 12, 16, 20),
          gap: getResponsiveValue(12, 16, 20, 24),
          paddingBottom: getResponsiveValue(20, 30, 40, 50),
        },
        card: {
          ...getCommonStyles(["shadow", "mainContainer"]),
          marginVertical: getResponsiveValue(4, 6, 8, 10),
          marginHorizontal: getResponsiveValue(2, 4, 6, 8),
          borderRadius: getResponsiveValue(8, 10, 12, 16),
          backgroundColor: colors.background,
          borderWidth: 1,
          alignSelf: "center",
          width: getResponsiveValue<DimensionValue>("95%", "95%", "95%", "80%"),
          alignItems: undefined,
          borderColor: colors.border + "40",
        },
        titleCard: {
          minHeight: getResponsiveValue(30, 40, 50, 60),
          paddingBottom: getResponsiveValue(8, 10, 12, 14),
          minWidth: getResponsiveValue(80, 100, 120, 140),
        },
        contentCard: {
          width: "100%",
          minHeight: getResponsiveValue(80, 100, 130, 170),
          padding: 0,
        },
        contentText: {
          lineHeight: getResponsiveValue(20, 22, 24, 26),
          color: colors.text,
          backgroundColor: colors.secondary + "30",
          padding: getResponsiveValue(8, 10, 12, 14),
          borderRadius: getResponsiveValue(6, 8, 10, 12),
          borderWidth: 1,
          borderColor: colors.border + "30",
          fontFamily: "monospace",
          maxHeight: getResponsiveValue(120, 140, 160, 180),
        },
        buttonContainer: {
          ...getCommonStyles("shadow"),
          padding: getResponsiveValue(12, 14, 16, 18),
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: getResponsiveValue(6, 8, 10, 12),
          marginTop: getResponsiveValue(8, 10, 12, 14),
          backgroundColor: colors.primary,
          minHeight: getResponsiveValue(40, 50, 60, 70),
        },
        buttonContainerSwitch: {
          ...getCommonStyles("shadow"),
          padding: getResponsiveValue(12, 14, 16, 18),
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: getResponsiveValue(6, 8, 10, 12),
          marginTop: getResponsiveValue(8, 10, 12, 14),
          backgroundColor: colors.primary,
          minHeight: getResponsiveValue(40, 50, 60, 70),
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        buttonText: {
          textAlign: "center",
          fontSize: getResponsiveValue(14, 16, 18, 20),
          color: colors.background,
        },
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles, colors };
};

export default useStylesDownDetectorScreen;
