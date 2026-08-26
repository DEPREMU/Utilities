import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesSnackBarComponent = () => {
  const { colors } = useAppBehavior();
  const { getCommonStyles } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          position: "relative",
          maxWidth: 500,
        },
        snackbar: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.primary,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
        },
        textSnackbar: {
          color: colors.background,
          padding: 8,
          fontSize: 16,
        },
        actionText: {
          ...getCommonStyles("shadow"),
          color: colors.primary,
          backgroundColor: colors.background,
          borderRadius: 8,
          padding: 8,
          fontSize: 16,
        },
      }),
    [colors.primary, colors.border, colors.background, getCommonStyles],
  );

  return { styles };
};

export default useStylesSnackBarComponent;
