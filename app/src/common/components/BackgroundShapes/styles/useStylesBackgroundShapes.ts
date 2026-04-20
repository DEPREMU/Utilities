import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesBackgroundShapes = () => {
  const { getCommonStyles } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        ...getCommonStyles("backgroundShapeOne"),
        ...getCommonStyles("backgroundShapeTwo"),
      }),
    [getCommonStyles],
  );

  return { styles };
};
