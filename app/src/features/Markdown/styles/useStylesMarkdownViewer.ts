import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesMarkdownViewer = () => {
  const { getResponsiveValue, getCommonStyles, texts } = useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scrollView: {
          flex: 1,
          width: "100%",
          padding: 8,
        },
        input: {
          ...getCommonStyles("shadow"),
          maxHeight: getResponsiveValue(150, 200, 250, 300),
          padding: 4,
          width: "100%",
          borderColor: "#ccc",
          borderWidth: 1,
          borderRadius: 8,
          marginBottom: 16,
          textAlignVertical: "top",
        },
        contentStyle: {
          fontSize: 16,
        },
        ...texts,
        ...getCommonStyles("container"),
      }),
    [texts, getCommonStyles, getResponsiveValue],
  );

  return { styles };
};
