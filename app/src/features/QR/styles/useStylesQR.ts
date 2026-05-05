import { useResponsiveLayout } from "@/context/LayoutContext";
import { useTheme } from "@/context/ThemeContext";
import { useMemo } from "react";
import { StyleSheet } from "react-native";

export const useStylesQR = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue, width, height } =
    useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        textInput: {
          width: getResponsiveValue("90%", "80%", "70%"),
          marginBottom: 10,
        },
        divider: {
          marginVertical: 8,
        },
        button: {
          marginTop: 10,
        },
        colorPicker: {
          width: getResponsiveValue("90%", "80%", "70%"),
          alignSelf: "center",
          gap: 10,
          justifyContent: "center",
        },
        colorPickerHue: {
          justifyContent: "center",
          alignSelf: "center",
        },
        colorPickerPanel: {
          width: "70%",
          height: "70%",
          alignSelf: "center",
          borderRadius: 10,
        },
        containerButtons: {
          flexDirection: "row",
          justifyContent: "space-around",
          width: "100%",
          marginVertical: 10,
        },
        cameraView: {
          flex: 1,
          width: "100%",
          height: "100%",
          borderRadius: 10,
        },
        imageQR: {
          width: getResponsiveValue(300, 400, 500),
          height: getResponsiveValue(300, 400, 500),
          marginTop: 20,
          alignSelf: "center",
          resizeMode: "contain",
        },
        resultContainer: {
          justifyContent: "center",
          alignItems: "center",
          marginTop: 20,
          backgroundColor: colors.primary,
          width: "100%",
          padding: 10,
        },
        resultTitle: {
          color: colors.text,
          fontSize: getResponsiveValue(16, 20, 24),
          fontWeight: "bold",
          textAlign: "center",
        },
        containerCamera: {
          flex: 1,
          width: "100%",
          position: "relative",
        },
        ...getCommonStyles("container"),
      }),
    [getCommonStyles, colors, getResponsiveValue],
  );

  return { styles, width, height, colors };
};
