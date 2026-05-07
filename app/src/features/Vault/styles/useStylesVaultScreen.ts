import { useMemo } from "react";
import { useTheme } from "@context/ThemeContext";
import { REPLACERS } from "@utils";
import { StyleSheet } from "react-native";
import { useResponsiveLayout } from "@context/LayoutContext";

export const useStylesVaultScreen = () => {
  const { colors } = useTheme();
  const { getCommonStyles, getResponsiveValue, width, height } =
    useResponsiveLayout();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          paddingHorizontal: 8,
        },
        title: {
          fontSize: getResponsiveValue(24, 28, 32),
          fontWeight: "bold",
          color: colors.text,
          marginBottom: 16,
        },
        subtitle: {
          opacity: 0.8,
          fontSize: getResponsiveValue(14, 16, 18),
          color: colors.text,
        },
        section: {
          gap: 8,
          width: "100%",
        },
        sectionTitle: {
          fontSize: getResponsiveValue(18, 20, 22),
          fontWeight: "600",
          color: colors.text,
          marginBottom: 8,
        },
        margin8: {
          marginTop: 8,
          marginBottom: 8,
        },
        lockedTitle: {
          fontSize: getResponsiveValue(20, 24, 28),
          fontWeight: "bold",
          color: colors.text,
          marginBottom: 8,
        },
        lockedMessage: {
          fontSize: getResponsiveValue(14, 16, 18),
          color: colors.text,
          textAlign: "center",
        },
        iconLeft: {
          width: getResponsiveValue(40, 50, 60),
          height: getResponsiveValue(40, 50, 60),
          borderRadius: 8,
          marginRight: getResponsiveValue(6, 8, 10),
          alignSelf: "center",
          justifyContent: "center",
          alignItems: "center",
        },
        foldersList: {
          maxHeight: 100,
        },
        filesList: {
          maxHeight: 200,
        },
        filesViewerList: {
          width: "100%",
          gap: 8,
          paddingBottom: 16,
        },
        fileItem: {
          alignItems: "center",
          justifyContent: "center",
          width: width / (REPLACERS.isWeb ? 4 : 3) - 11,
          height: width / (REPLACERS.isWeb ? 4 : 3) - 11,
          margin: 2,
        },
        fileName: {
          fontSize: getResponsiveValue(16, 18, 20),
          color: colors.text,
        },
        folderItem: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 8,
          paddingHorizontal: 12,
          marginRight: 12,
        },
        folderIcon: {
          marginRight: 8,
        },
        folderName: {
          fontSize: getResponsiveValue(16, 18, 20),
          color: colors.text,
        },
        modalContent: {
          flex: 1,
          width: "100%",
          justifyContent: "flex-start",
          backgroundColor: colors.secondary,
        },
        modalFooter: {
          width: "100%",
          padding: 8,
          position: "absolute",
          zIndex: 100,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          bottom: 0,
        },
        imageModal: {
          width: "100%",
          height: "100%",
        },
        videoModal: {
          flex: 1,
          width: "100%",
        },
        modal: {
          flex: 1,
          width,
          height,
          zIndex: 100,
        },
        modalContainer: {
          flex: 1,
          width: "100%",
          backgroundColor: colors.background,
        },
        modalHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: getResponsiveValue(12, 16, 20),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        modalTitle: {
          fontSize: getResponsiveValue(18, 20, 22),
          fontWeight: "600",
          color: colors.text,
          marginLeft: 8,
          maxWidth: "75%",
        },
        modalCloseButton: {
          flex: 1 / 4,
        },
        modalInfoLabel: {
          fontSize: getResponsiveValue(14, 16, 18),
          fontWeight: "500",
          color: colors.text,
        },
        modalInfoValue: {
          fontSize: getResponsiveValue(14, 16, 18),
          color: colors.primary,
          marginBottom: 8,
        },
        modalInfoRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          paddingHorizontal: 16,
        },
        modalInfoColumn: {
          flexDirection: "column",
          width: "100%",
          paddingHorizontal: 16,
        },
        modalScrollView: {
          flexGrow: 0,
          maxHeight: height / 2,
        },
        modalText: {
          color: colors.text,
          fontSize: getResponsiveValue(16, 18, 20),
        },
        fileItemSelected: {
          borderStyle: "solid",
          borderWidth: 2,
          borderColor: colors.info,
        },
        progressBar: {
          height: 10,
          borderRadius: 5,
          backgroundColor: colors.border,
        },
        modalTextInput: {
          marginTop: 16,
          marginBottom: 16,
          color: colors.text,
        },
        pdf: {
          flex: 1,
          width: "100%",
        },
        FAB: {
          position: "absolute",
          right: 16,
          bottom: 80,
          backgroundColor: colors.primary,
          zIndex: 20,
        },
        absolute: {
          position: "absolute",
        },
        ...getCommonStyles("container"),
      }),
    [colors, getCommonStyles, getResponsiveValue, width, height],
  );

  const returnValue = useMemo(
    () => ({ styles, width, height }),
    [styles, width, height],
  );

  return returnValue;
};
