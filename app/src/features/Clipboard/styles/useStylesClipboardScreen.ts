import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { useResponsiveLayout } from "@context/LayoutContext";
import { DimensionValue, StyleSheet } from "react-native";

export const useStylesClipboardScreen = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue, texts } = useResponsiveLayout();

  const FAB = useMemo(() => getCommonStyles("FAB").FAB, [getCommonStyles]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          width: "100%",
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
        },
        buttonsContainer: {
          flex: 1,
          gap: getResponsiveValue(10, 12, 14, 16),
          flexDirection: "row",
          justifyContent: "flex-end",
        },
        showDeletedContainer: {
          width: "100%",
          alignItems: "center",
          flexDirection: "row",
          marginVertical: 10,
          justifyContent: "space-between",
          backgroundColor: colors.background,
          paddingVertical: getResponsiveValue(10, 12, 14, 16),
          paddingHorizontal: getResponsiveValue(8, 10, 12, 14),
        },
        switchLabel: {
          fontSize: getResponsiveValue(15, 17, 19, 21),
          color: colors.text,
          marginTop: 0,
        },
        noMoreDataContainer: {
          padding: getResponsiveValue(5, 7, 9, 11),
          alignItems: "center",
        },
        noMoreDataText: {
          color: colors.text,
          fontSize: getResponsiveValue(14, 16, 18, 20),
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: getResponsiveValue(14, 16, 18, 20),
          backgroundColor: colors.secondary,
          paddingVertical: getResponsiveValue(6, 8, 10, 12),
          paddingHorizontal: getResponsiveValue(10, 12, 14, 16),
        },
        contentContainer: {
          gap: getResponsiveValue(12, 16, 20, 24),
          padding: getResponsiveValue(4, 8, 12, 16),
          paddingBottom: getResponsiveValue(20, 30, 40, 50),
        },
        card: {
          ...getCommonStyles("sectionContainer").sectionContainer,
          ...getCommonStyles("shadow").shadow,
          gap: getResponsiveValue(5, 8, 12, 16),
          width: getResponsiveValue<DimensionValue>("95%", "95%", "95%", "80%"),
          alignSelf: "center",
        },
        titleContainer: {
          flex: 1,
          minWidth: getResponsiveValue(40, 60, 80, 100),
          minHeight: getResponsiveValue(30, 40, 50, 60),
          justifyContent: "center",
        },
        titleCard: {
          ...getCommonStyles("subtitle").subtitle,
        },
        contentCard: {
          width: "100%",
          minHeight: getResponsiveValue(80, 100, 130, 170),
          maxHeight: getResponsiveValue(200, 240, 280, 320),
          marginBottom: getResponsiveValue(8, 10, 12, 14),
        },
        contentText: {
          color: colors.text,
          padding: getResponsiveValue(8, 10, 12, 14),
          fontFamily: "monospace",
          lineHeight: getResponsiveValue(20, 22, 24, 26),
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: getResponsiveValue(6, 8, 10, 12),
          backgroundColor: colors.secondary,
        },
        buttonContainer: {
          ...getCommonStyles("shadow").shadow,
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
        searchBar: {
          marginVertical: 0,
          marginHorizontal: 0,
          borderRadius: getResponsiveValue(8, 10, 12, 16),
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        },
        gap: {
          gap: getResponsiveValue(8, 10, 12, 14),
        },
        FAB,
        ...texts,
        ...getCommonStyles("flex"),
        ...getCommonStyles("divider"),
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
        ...getCommonStyles("sectionContainer"),
      }),
    [getCommonStyles, getResponsiveValue, colors, texts, FAB],
  );

  return { styles, colors };
};
