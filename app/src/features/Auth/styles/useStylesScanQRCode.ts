import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesScanQRCode = () => {
  const { colors } = useAppBehavior();
  const { width, height, getCommonStyles, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cameraView: {
          width: "100%",
          height: 400,
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: colors.secondary,
        },
        ...texts,
        ...getCommonStyles("container"),
      }),
    [colors, getCommonStyles, texts],
  );

  return { styles, height, width, colors };
};
