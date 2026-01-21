import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { useResponsiveLayout } from "@context/LayoutContext";
import { DimensionValue, StyleSheet } from "react-native";

const useStylesSelectionScreen = () => {
  const colors = useTheme();
  const { getResponsiveValue, getCommonStyles } = useResponsiveLayout();
  const { background, text, primary, error, secondary, accent } = colors;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          paddingTop: 5,
          alignItems: undefined,
          backgroundColor: background,
        },
        header: {
          marginBottom: getResponsiveValue(20, 25, 30, 35),
          ...getCommonStyles(["shadow", "mainContainer"], {
            copyInsets: false,
          }),
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: secondary,
          paddingVertical: getResponsiveValue(20, 24, 28, 32),
          paddingHorizontal: getResponsiveValue(16, 20, 24, 32),
          borderBottomLeftRadius: getResponsiveValue(20, 22, 24, 28),
          borderBottomRightRadius: getResponsiveValue(20, 22, 24, 28),
          gap: getResponsiveValue(10, 12, 14, 16),
          elevation: 8,
          maxHeight: getResponsiveValue(150, 120, 140, 160),
          borderWidth: 2,
          borderColor: primary,
        },
        scrollContainer: {
          flex: 1,
          marginBottom: getResponsiveValue(70, 80, 90, 100),
          paddingHorizontal: getResponsiveValue(8, 20, 24, 32),
        },
        scrollContentContainer: {
          justifyContent: "center",
        },
        buttonText: {
          color: text,
          fontSize: getResponsiveValue(16, 17, 18, 20),
          textAlign: "center",
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        clearCacheButton: {
          ...getCommonStyles(["shadow", "mainContainer"], {
            copyInsets: false,
          }),
          padding: getResponsiveValue(12, 15, 18, 21),
          backgroundColor: error,
          borderRadius: getResponsiveValue(12, 14, 16, 18),
          marginHorizontal: getResponsiveValue(6, 7, 8, 10),
          borderWidth: 2,
          borderColor: accent,
        },
        showSelectedButton: {
          ...getCommonStyles(["shadow", "mainContainer"], {
            copyInsets: false,
          }),
          backgroundColor: primary,
          width: "auto",
          borderRadius: getResponsiveValue(12, 14, 16, 18),
          padding: getResponsiveValue(12, 15, 18, 21),
          marginHorizontal: getResponsiveValue(6, 7, 8, 10),
          borderWidth: 2,
          borderColor: secondary,
        },
        buttonsBottom: {
          position: "absolute",
          bottom: 0,
          flexDirection: "row",
          paddingHorizontal: getResponsiveValue(8, 10, 12, 16),
          paddingVertical: getResponsiveValue(12, 14, 16, 20),
          backgroundColor: background,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: primary,
          maxWidth: getResponsiveValue<DimensionValue>(
            "100%",
            "100%",
            "90%",
            1200,
          ),
          alignSelf: "center",
          width: "100%",
        },
        input: {
          ...getCommonStyles("shadow"),
          backgroundColor: background,
          color: text,
          fontSize: getResponsiveValue(16, 17, 18, 20),
          textAlign: "center",
          borderColor: primary,
          borderWidth: 2,
          borderRadius: getResponsiveValue(10, 11, 12, 14),
          width: getResponsiveValue<DimensionValue>(
            "100%",
            "100%",
            "100%",
            "80%",
          ),
        },
      }),
    [
      text,
      error,
      accent,
      primary,
      secondary,
      background,
      getCommonStyles,
      getResponsiveValue,
    ],
  );

  return { styles, ...colors };
};

export default useStylesSelectionScreen;
