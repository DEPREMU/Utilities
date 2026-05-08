import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesChangeImageFormat = () => {
  const { colors } = useTheme();
  const { texts, getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          width: "100%",
          maxWidth: getResponsiveValue(520, 720, 860, 980),
          marginBottom: getResponsiveValue(14, 18, 22, 22),
          paddingHorizontal: getResponsiveValue(2, 4, 6, 6),
        },
        content: {
          width: "100%",
          maxWidth: getResponsiveValue(520, 720, 860, 980),
          alignItems: "stretch",
          paddingHorizontal: getResponsiveValue(2, 4, 6, 6),
        },
        selectedImageItem: {
          ...getCommonStyles("shadow").shadow,
          width: "100%",
          maxWidth: getResponsiveValue(520, 720, 860, 980),
          backgroundColor: colors.secondary,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: getResponsiveValue(14, 16, 18, 18),
          paddingVertical: getResponsiveValue(12, 14, 16, 16),
          paddingHorizontal: getResponsiveValue(12, 14, 16, 16),
          marginBottom: getResponsiveValue(14, 16, 18, 18),
          alignItems: "stretch",
        },
        selectedImagePreview: {
          width: "100%",
          height: getResponsiveValue(180, 220, 260, 280),
          resizeMode: "contain",
          borderRadius: getResponsiveValue(12, 14, 16, 16),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          marginTop: getResponsiveValue(8, 10, 12, 12),
          marginBottom: getResponsiveValue(10, 12, 14, 14),
        },
        selectedImagePreviewConverting: {
          width: "100%",
          height: getResponsiveValue(180, 220, 260, 280),
          resizeMode: "contain",
          borderRadius: getResponsiveValue(12, 14, 16, 16),
          borderWidth: 2,
          borderColor: colors.warning,
          opacity: 0.6,
          backgroundColor: colors.background,
          marginTop: getResponsiveValue(8, 10, 12, 12),
          marginBottom: getResponsiveValue(10, 12, 14, 14),
        },
        ...texts,
        ...getCommonStyles("FAB"),
        ...getCommonStyles("divider"),
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
        ...getCommonStyles("sectionContainer"),
      }),
    [texts, colors, getCommonStyles, getResponsiveValue],
  );

  return { styles, colors };
};
