import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { useResponsiveLayout } from "@/context/LayoutContext";

const useStylesTranslator = () => {
  const { getCommonStyles, getResponsiveValue } = useResponsiveLayout();
  const colors = useAppBehavior();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          ...getCommonStyles("shadow").shadow,
          ...getCommonStyles("container").container,
          padding: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        body: {
          flex: 3,
          width: "100%",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: getResponsiveValue(12, 16, 20, 24),
        },
        title: {
          fontSize: getResponsiveValue(28, 32, 36, 40),
          fontWeight: "800",
          color: colors.primary,
          textAlign: "center",
          marginBottom: getResponsiveValue(24, 30, 36, 42),
          letterSpacing: 1,
          textShadowColor: colors.shadow + "30",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        },
        translateText: {
          fontSize: getResponsiveValue(16, 18, 20, 22),
          fontWeight: "600",
          color: colors.text,
          marginBottom: getResponsiveValue(12, 16, 20, 24),
          textAlign: "center",
          letterSpacing: 0.5,
        },
        translatedText: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.secondary,
          borderRadius: getResponsiveValue(12, 16, 20, 24),
          borderWidth: 2,
          borderColor: colors.primary,
          padding: getResponsiveValue(16, 20, 24, 28),
          marginBottom: getResponsiveValue(20, 24, 28, 32),
          minHeight: getResponsiveValue(100, 120, 140, 160),
          maxHeight: getResponsiveValue(200, 240, 280, 320),
          fontSize: getResponsiveValue(14, 16, 18, 20),
          color: colors.text,
          fontWeight: "500",
          textAlignVertical: "top",
          width: "100%",
          maxWidth: 500,
        },
        textInput: {
          backgroundColor: colors.secondary,
          marginBottom: getResponsiveValue(20, 24, 28, 32),
          width: "100%",
          maxWidth: 500,
          fontSize: getResponsiveValue(14, 16, 18, 20),
        },
        list: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.secondary,
          borderRadius: getResponsiveValue(12, 16, 20, 24),
          borderWidth: 1,
          borderColor: colors.primary,
          marginBottom: getResponsiveValue(20, 24, 28, 32),
          width: "100%",
          minWidth: getResponsiveValue(200, 300, 420, 480),
          paddingLeft: getResponsiveValue(8, 12, 16, 20),
          overflow: "hidden",
        },
        listItem: {
          width: "90%",
          alignSelf: "center",
          backgroundColor: colors.secondary,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.primary + "30",
          paddingHorizontal: getResponsiveValue(16, 20, 24, 28),
          paddingVertical: getResponsiveValue(12, 16, 20, 24),
        },
        buttonTranslate: {
          ...getCommonStyles("shadow"),
          backgroundColor: colors.primary,
          borderRadius: getResponsiveValue(12, 16, 20, 24),
          paddingHorizontal: getResponsiveValue(24, 30, 36, 42),
          paddingVertical: getResponsiveValue(14, 18, 22, 26),
          marginTop: getResponsiveValue(20, 24, 28, 32),
          borderWidth: 2,
          borderColor: colors.accent,
          width: "100%",
          minWidth: getResponsiveValue(150, 180, 210, 240),
        },
        textTranslate: {
          fontSize: getResponsiveValue(16, 18, 20, 22),
          fontWeight: "700",
          color: colors.background,
          textAlign: "center",
          letterSpacing: 0.5,
        },
        ...getCommonStyles("container"),
      }),
    [getCommonStyles, getResponsiveValue, colors],
  );

  return { styles };
};

export default useStylesTranslator;
