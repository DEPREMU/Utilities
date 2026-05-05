import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@/context/LayoutContext";

const useStylesChangeImageFormat = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("container").container,
          alignItems: "center",
          justifyContent: "flex-start",
        },
        header: {
          width: "100%",
          maxWidth: getResponsiveValue(520, 720, 860, 980),
          marginBottom: getResponsiveValue(14, 18, 22, 22),
          paddingHorizontal: getResponsiveValue(2, 4, 6, 6),
        },
        title: {
          color: colors.primary,
          fontSize: getResponsiveValue(22, 26, 30, 32),
          textAlign: "left",
          fontWeight: "700",
          letterSpacing: 0.2,
        },
        content: {
          width: "100%",
          maxWidth: getResponsiveValue(520, 720, 860, 980),
          alignItems: "stretch",
          paddingHorizontal: getResponsiveValue(2, 4, 6, 6),
        },
        paragraph: {
          color: colors.text,
          fontSize: getResponsiveValue(14, 16, 18, 18),
          textAlign: "left",
          lineHeight: getResponsiveValue(20, 22, 24, 24),
          opacity: 0.9,
          marginBottom: getResponsiveValue(12, 16, 18, 18),
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
        selectedImageText: {
          color: colors.text,
          fontSize: getResponsiveValue(13, 14, 16, 16),
          lineHeight: getResponsiveValue(18, 20, 22, 22),
          marginBottom: getResponsiveValue(4, 5, 6, 6),
          opacity: 0.92,
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
        scrollViewContainer: {
          width: "100%",
        },
        scrollViewContent: {
          alignItems: "center",
          paddingBottom: getResponsiveValue(22, 30, 40, 40),
        },
        selectedImagesContainer: {
          width: "100%",
          alignItems: "center",
          marginTop: getResponsiveValue(14, 18, 22, 22),
        },
      }),
    [colors, getCommonStyles, getResponsiveValue],
  );

  return { styles };
};

export default useStylesChangeImageFormat;
