import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useResponsiveLayout } from "@/context/LayoutContext";
import { DimensionValue, StyleSheet } from "react-native";

export const useStylesClipboardScreen = () => {
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
        sectionContainer: {
          ...getCommonStyles("shadow"),
          width: "90%",
          padding: getResponsiveValue(10, 12, 14, 16),
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: getResponsiveValue(8, 10, 12, 14),
          flexDirection: "row",
          justifyContent: "space-around",
          backgroundColor: colors.secondary,
        },
        switchLabel: {
          fontSize: getResponsiveValue(14, 16, 18, 20),
          color: colors.text,
          marginTop: getResponsiveValue(4, 6, 8, 10),
        },
        scrollToTopFAB: {
          right: 20,
          bottom: 20,
          position: "absolute",
          borderWidth: 1,
          borderColor: colors.accent,
          backgroundColor: colors.background,
        },
        noMoreDataContainer: {
          padding: getResponsiveValue(10, 12, 14, 16),
          alignItems: "center",
        },
        noMoreDataText: {
          color: colors.text,
          fontSize: getResponsiveValue(14, 16, 18, 20),
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
          borderColor: colors.border,
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
          maxHeight: getResponsiveValue(200, 240, 280, 320),
          marginBottom: getResponsiveValue(8, 10, 12, 14),
        },
        contentCardAndroid: {
          color: colors.text,
          padding: getResponsiveValue(8, 10, 12, 14),
          fontFamily: "monospace",
          lineHeight: getResponsiveValue(20, 22, 24, 26),
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: getResponsiveValue(6, 8, 10, 12),
          backgroundColor: colors.secondary,
        },
        contentText: {
          lineHeight: getResponsiveValue(20, 22, 24, 26),
          color: colors.text,
          backgroundColor: colors.secondary,
          padding: getResponsiveValue(8, 10, 12, 14),
          borderRadius: getResponsiveValue(6, 8, 10, 12),
          borderWidth: 1,
          borderColor: colors.border,
          fontFamily: "monospace",
          maxHeight: getResponsiveValue(120, 140, 160, 180),
        },
        buttonContainer: {
          ...getCommonStyles("shadow"),
          padding: getResponsiveValue(12, 14, 16, 18),
          marginTop: getResponsiveValue(8, 10, 12, 14),
          minHeight: getResponsiveValue(40, 50, 60, 70),
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: getResponsiveValue(6, 8, 10, 12),
          backgroundColor: colors.secondary,
        },
        buttonDelete: {
          backgroundColor: colors.error,
        },
        buttonRestore: {
          backgroundColor: colors.success,
        },
        buttonText: {
          textAlign: "center",
          fontSize: getResponsiveValue(14, 16, 18, 20),
          color: colors.text,
        },
        searchBar: {
          marginVertical: getResponsiveValue(8, 10, 12, 14),
          marginHorizontal: getResponsiveValue(4, 6, 8, 10),
          borderRadius: getResponsiveValue(8, 10, 12, 16),
          backgroundColor: colors.secondary,
          borderWidth: 1,
          borderColor: colors.border,
        },
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles, colors };
};
