import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesStreamers = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();
  const valueFontSize = getResponsiveValue(14, 16, 18, 20);
  const paddingTextInput = getResponsiveValue(10, 12, 14, 16);
  const streamerImageSize = getResponsiveValue(60, 70, 80, 90);
  const textTitleFontSize = getResponsiveValue(18, 20, 22, 24);
  const marginSizeNameStreamer = getResponsiveValue(5, 6, 7, 8);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.background,
        },
        title: {
          fontSize: getResponsiveValue(24, 28, 32, 36),
          fontWeight: "bold",
          color: colors.text,
          textAlign: "center",
          marginVertical: 10,
        },
        textInput: {
          backgroundColor: colors.secondary,
          flex: 1,
          margin: 10,
          padding: paddingTextInput,
          borderRadius: 5,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
        },
        containerScrollView: {
          flex: 1,
          width: "100%",
        },
        contentContainer: {
          alignItems: "center",
          justifyContent: "center",
          padding: 10,
        },
        containerAdd: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginVertical: 10,
        },
        buttonAdd: {
          backgroundColor: colors.primary,
          padding: 10,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 5,
          margin: 10,
          width: "auto",
          ...getCommonStyles("shadow"),
        },
        textButton: {
          color: colors.text,
          fontSize: valueFontSize,
          textAlign: "center",
          fontWeight: "600",
        },
        containerStreamer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginVertical: 10,
          backgroundColor: colors.primary,
          padding: 12,
          borderRadius: 10,
          ...getCommonStyles("shadow"),
        },
        streamerImage: {
          width: streamerImageSize,
          height: streamerImageSize,
          borderRadius: streamerImageSize / 2,
          borderWidth: 2,
          borderColor: colors.primary,
        },
        containerData: {
          flex: 1,
          marginHorizontal: 10,
          justifyContent: "space-evenly",
          alignItems: "center",
          flexDirection: "row",
        },
        nameStreamer: {
          fontSize: valueFontSize,
          fontWeight: "bold",
          color: colors.text,
          marginTop: marginSizeNameStreamer,
        },
        isLiveStreamer: {
          fontSize: valueFontSize - 2,
          color: colors.secondary,
          fontWeight: "500",
        },
        containerImageAndName: {
          alignItems: "center",
          justifyContent: "center",
        },
        buttonVisit: {
          backgroundColor: colors.secondary,
          padding: 8,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 5,
          margin: 5,
          minWidth: getResponsiveValue(80, 90, 100, 110),
        },
        containerButtons: {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        },
        yourStreamers: {
          fontSize: textTitleFontSize - 2,
          fontWeight: "bold",
          color: colors.text,
          textAlign: "center",
          marginVertical: 10,
        },
      }),
    [
      colors,
      getCommonStyles,
      getResponsiveValue,
      paddingTextInput,
      valueFontSize,
      streamerImageSize,
      marginSizeNameStreamer,
      textTitleFontSize,
    ],
  );

  return { styles };
};
