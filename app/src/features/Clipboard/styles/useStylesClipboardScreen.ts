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
          width: "100%",
          paddingHorizontal: getResponsiveValue(6, 10, 14, 18),
          alignSelf: "center",
        },
        containerFlatList: {
          flex: 1,
          width: "100%",
        },
        topControlsContainer: {
          ...getCommonStyles("shadow"),
          width: "100%",
          borderRadius: getResponsiveValue(10, 12, 14, 16),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.secondary,
          paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
          paddingTop: getResponsiveValue(6, 8, 10, 12),
          paddingBottom: getResponsiveValue(10, 12, 14, 16),
          marginBottom: getResponsiveValue(8, 10, 12, 14),
          gap: getResponsiveValue(8, 10, 12, 14),
        },
        sectionContainer: {
          width: "100%",
          paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
          paddingVertical: getResponsiveValue(10, 12, 14, 16),
          alignItems: "center",
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: getResponsiveValue(8, 10, 12, 14),
          marginBottom: 0,
          flexDirection: "row",
          justifyContent: "space-between",
          backgroundColor: colors.background,
        },
        switchLabel: {
          fontSize: getResponsiveValue(15, 17, 19, 21),
          color: colors.text,
          marginTop: 0,
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
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.secondary,
          borderRadius: getResponsiveValue(14, 16, 18, 20),
          paddingHorizontal: getResponsiveValue(10, 12, 14, 16),
          paddingVertical: getResponsiveValue(6, 8, 10, 12),
        },
        contentContainer: {
          padding: getResponsiveValue(4, 8, 12, 16),
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
          paddingVertical: getResponsiveValue(10, 12, 14, 16),
          paddingHorizontal: getResponsiveValue(12, 14, 16, 18),
          marginTop: getResponsiveValue(6, 8, 10, 12),
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
          marginVertical: 0,
          marginHorizontal: 0,
          height: getResponsiveValue(46, 50, 54, 58),
          borderRadius: getResponsiveValue(8, 10, 12, 16),
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        },
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles, colors };
};
