import { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@/context/LayoutContext";

/**
 * @function  useStylesScanQRCode
 */
const useStylesScanQRCode = () => {
  const colors = useTheme();
  const { background, secondary, text } = colors;
  const { width, height, getCommonStyles } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer", { fallbackValues: [40, 20] }),
          backgroundColor: background,
        },
        text: {
          color: text,
          fontSize: 16,
          textAlign: "center",
          marginTop: 20,
        },
        cameraView: {
          width: "100%",
          height: 400,
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: secondary,
        },
      }),
    [background, getCommonStyles, text, secondary],
  );

  return { styles, height, width, ...colors };
};

export default useStylesScanQRCode;
