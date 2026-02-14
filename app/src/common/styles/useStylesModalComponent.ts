import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useResponsiveLayout } from "@/context/LayoutContext";
import { DimensionValue, StatusBar, StyleSheet } from "react-native";

export const useStylesModalComponent = () => {
  const { height, width, getCommonStyles, getResponsiveValue } =
    useResponsiveLayout();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          ...getCommonStyles("mainContainer"),
          backgroundColor: colors.overlay,
          position: "absolute",
          zIndex: 1000,
          left: 0,
          top: 0,
          height: height + (StatusBar?.currentHeight || 0),
          maxHeight: height + (StatusBar?.currentHeight || 0),
          cursor: "auto",
        },
        modal: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.background,
          cursor: "auto",
          borderRadius: 8,
          width: "90%",
          maxWidth: getResponsiveValue<DimensionValue>("90%", 400, 500),
          padding: 20,
          gap: getResponsiveValue(10, 20, 30),
          borderWidth: 1,
          borderColor: colors.border,
          flex: 1 / 2,
          height: "auto",
          maxHeight: height * 0.75,
        },
        title: {
          fontWeight: "bold",
          fontSize: getResponsiveValue(18, 22, 26),
          borderRadius: 8,
          padding: getResponsiveValue(0, 15, 20),
          textAlign: "center",
          color: colors.primary,
          flex: 1 / 5,
        },
        body: {
          paddingHorizontal: getResponsiveValue(10, 20, 30),
          borderRadius: 8,
          width: "100%",
          maxWidth: "100%",
          overflow: "scroll",
          flex: 1,
        },
        buttons: {
          flexDirection: "row",
          justifyContent: "flex-end",
          paddingVertical: getResponsiveValue(10, 0, 0),
          alignItems: "center",
          paddingHorizontal: getResponsiveValue(10, 20, 30),
          gap: 10,
          borderRadius: 8,
        },
        messageText: {
          paddingHorizontal: getResponsiveValue(10, 20, 30),
          borderRadius: 8,
          padding: getResponsiveValue(10, 0, 0),
          fontSize: getResponsiveValue(14, 18, 22),
          textAlign: "center",
          color: colors.text,
          maxHeight: height * 0.5,
        },
      }),
    [getCommonStyles, colors, getResponsiveValue, height],
  );

  return useMemo(() => ({ styles, height, width }), [styles, height, width]);
};
