import { useMemo } from "react";
import { StyleSheet, Platform } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";

export const useStylesOtpInput = () => {
  const { colors } = useAppBehavior();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          width: "100%",
          marginVertical: 16,
          position: "relative",
        },
        hiddenInput: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0,
          zIndex: 1,
        },
        cellsRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        },
        cell: {
          flex: 1,
          maxWidth: 42,
          height: 48,
          borderWidth: 1.5,
          borderRadius: 8,
          justifyContent: "center",
          alignItems: "center",
          marginHorizontal: 2,
        },
        cellActive: {
          borderWidth: 2,
        },
        cellText: {
          fontSize: 18,
          fontWeight: "700",
          fontFamily: Platform.select({
            ios: "Courier",
            android: "monospace",
            default: "monospace",
          }),
          textAlign: "center",
        },
      }),
    [],
  );

  return { styles, colors };
};

export default useStylesOtpInput;
