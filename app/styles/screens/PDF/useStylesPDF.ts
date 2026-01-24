import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesPDF = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue, width } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...getCommonStyles("mainContainer"),
          alignItems: undefined,
          justifyContent: "flex-start",
        },
        pdf: {
          flex: 1,
          width: "100%",
        },
        scrollView: {
          maxHeight: getResponsiveValue(200, 300, 400),
        },
        menuAnchor: {
          alignSelf: "center",
          marginVertical: getResponsiveValue(10, 15, 20),
        },
        listItem: {
          marginVertical: getResponsiveValue(5, 8, 10),
          marginHorizontal: getResponsiveValue(10, 15, 20),
          backgroundColor: colors.accent,
          width: "100%",
        },
        buttonSelectImages: {
          marginVertical: getResponsiveValue(15, 20, 25),
          marginHorizontal: getResponsiveValue(20, 30, 40),
          paddingVertical: getResponsiveValue(10, 15, 20),
        },
        list: {
          flex: 1,
          width: "100%",
          marginTop: 20,
        },
        listContainer: {
          paddingBottom: 50,
        },
        image: {
          width: (width - getResponsiveValue(60, 90, 120)) / 3,
          height: (width - getResponsiveValue(60, 90, 120)) / 3,
          borderRadius: 10,
        },
        divider: {
          marginVertical: getResponsiveValue(10, 15, 20),
        },
        textInput: {
          marginHorizontal: getResponsiveValue(20, 30, 40),
          marginBottom: getResponsiveValue(15, 20, 25),
        },
      }),
    [colors, getCommonStyles, getResponsiveValue, width],
  );

  return { styles };
};
