import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesPDF = () => {
  const { colors } = useAppBehavior();
  const { getCommonStyles, getResponsiveValue, width } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          zIndex: 10 as const,
        },
        divider: {
          marginVertical: getResponsiveValue(10, 15, 20),
        },
        textInput: {
          marginHorizontal: getResponsiveValue(20, 30, 40),
          marginBottom: getResponsiveValue(15, 20, 25),
        },
        deletingItem: {
          opacity: 0.5,
          backgroundColor: colors.error,
          borderWidth: 2,
          borderColor: colors.error,
        },
        buttonsContainer: {
          flexDirection: "row",
          justifyContent: "space-between",
          width: "100%",
          paddingHorizontal: getResponsiveValue(20, 30, 40),
          marginTop: getResponsiveValue(10, 15, 20),
        },
        button: {
          flex: 1,
          marginHorizontal: getResponsiveValue(10, 20, 30),
          marginBottom: getResponsiveValue(5, 10, 15),
        },
        ...getCommonStyles("container"),
      }),
    [colors, getCommonStyles, getResponsiveValue, width],
  );

  return { styles };
};
