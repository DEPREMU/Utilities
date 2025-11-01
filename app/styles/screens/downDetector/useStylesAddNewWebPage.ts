import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

const useStylesAddNewWebPage = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          padding: getResponsiveValue(20, 30, 40),
          backgroundColor: colors.background,
        },
        title: {
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 20,
          textAlign: "center",
        },
        switch: {
          alignSelf: "center",
        },
        switchContainer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          width: getResponsiveValue("95%", "100%", "100%"),
        },
        switchLabel: {
          fontSize: 16,
          color: colors.text,
        },
        textInput: {
          ...getCommonStyles("shadow"),
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          padding: 15,
          fontSize: 16,
          minHeight: 100,
          maxHeight: 400,
          width: getResponsiveValue("95%", "100%", "100%"),
          textAlignVertical: "top",
          color: colors.text,
          backgroundColor: colors.secondary,
          marginBottom: 20,
        },
        button: {
          backgroundColor: colors.primary,
          padding: 15,
          borderRadius: 8,
          alignItems: "center",
        },
        textButton: {
          color: colors.text,
          fontSize: 16,
          fontWeight: "bold",
        },
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles };
};

export default useStylesAddNewWebPage;
