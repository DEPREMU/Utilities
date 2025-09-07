import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesTranslator = () => {
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();
  const colors = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          backgroundColor: colors.background,
          padding: getResponsiveValue(16, 20, 24),
        },
        title: {
          textAlign: "center",
          marginBottom: getResponsiveValue(16, 20, 24),
        },
        translateText: {
          marginBottom: getResponsiveValue(8, 12, 16),
        },
        translatedText: {
          padding: getResponsiveValue(12, 16, 20),
          borderRadius: getResponsiveValue(8, 10, 12),
          marginBottom: getResponsiveValue(16, 20, 24),
          minHeight: getResponsiveValue(80, 100, 120),
          textAlignVertical: "top",
        },
        textInput: {
          marginBottom: getResponsiveValue(16, 20, 24),
        },
        list: {
          ...getCommonStyles("shadow"),
          marginBottom: getResponsiveValue(16, 20, 24),
          borderRadius: getResponsiveValue(8, 10, 12),
        },
        listItem: {
          paddingHorizontal: getResponsiveValue(12, 16, 20),
        },
        buttonTranslate: {
          marginTop: getResponsiveValue(16, 20, 24),
        },
        textTranslate: {
          fontWeight: "600",
        },
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles };
};

export default useStylesTranslator;
