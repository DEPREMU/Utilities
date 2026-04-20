import { useTheme } from "@context/ThemeContext";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@/context/LayoutContext";
import { useMemo } from "react";

export const useStylesAuthScreens = () => {
  const { colors } = useTheme();
  const { width, height, getCommonStyles, getResponsiveValue, texts } =
    useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          ...getCommonStyles("sectionContainer").sectionContainer,
          width: "90%",
          alignSelf: "center",
          maxWidth: 400,
          padding: 20,
          justifyContent: "space-evenly",
          minHeight: 300,
        },
        contentContainer: {
          flex: 1,
          justifyContent: "center",
        },
        inputContainer: {
          ...getCommonStyles("shadow").shadow,
          width: "100%",
          marginBottom: 20,
          position: "relative",
        },
        input: {
          width: "100%",
          borderRadius: 12,
          fontSize: 16,
          paddingHorizontal: 16,
        },
        showPasswordButton: {
          position: "absolute",
          right: 15,
          top: "50%",
          transform: [{ translateY: -12 }],
          width: 24,
          height: 24,
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2,
        },
        loginButton: {
          height: 56,
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          borderWidth: 2,
          borderColor: colors.secondary,
        },
        inputError: {
          borderWidth: 2,
          borderColor: colors.error,
          backgroundColor: colors.background,
        },
        linksContainer: {
          width: "100%",
          alignItems: "center",
          marginTop: 20,
        },
        linkText: {
          ...getCommonStyles("paragraph").paragraph,
          textDecorationLine: "underline",
        },
        rememberMeContainer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginTop: 20,
          marginBottom: 10,
          paddingHorizontal: 5,
        },
        loadingIndicator: {
          marginRight: 10,
        },
        marginRight10: {
          marginRight: 10,
        },
        typeLoginContainer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginTop: 10,
          paddingHorizontal: 5,
        },
        loginTypeContainer: {
          backgroundColor: colors.background,
          justifyContent: "center",
          width: "100%",
          minHeight: 200,
        },
        qrCodeContainer: {
          marginTop: 20,
          alignItems: "center",
          justifyContent: "center",
        },
        qrCodeImage: {
          width: 250,
          height: 250,
          resizeMode: "contain",
        },
        segmentedButtons: {
          width: "100%",
          marginVertical: getResponsiveValue(12, 16, 20),
        },
        ...texts,
        ...getCommonStyles("flex"),
        ...getCommonStyles("divider"),
        ...getCommonStyles("container"),
        ...getCommonStyles("scrollView"),
      }),
    [colors, getCommonStyles, getResponsiveValue, texts],
  );

  return { styles, height, width, colors };
};
