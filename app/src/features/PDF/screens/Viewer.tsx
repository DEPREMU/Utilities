import { View } from "react-native";
import { REPLACERS } from "@common";
import { usePDFStore } from "../services/zustand";
import { useLanguage } from "@context/LanguageContext";
import { useStylesPDF } from "@screens/PDF/styles/useStylesPDF";
import * as ExpoFileSystem from "expo-file-system";
import { Button, Divider } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect } from "react";
import { PDF, memoDeep, URI_EXTENSION, sanitizeFileName } from "@utils";

const Viewer: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesPDF();

  const uri = usePDFStore((s) => s.pdfUri);
  const setUriState = usePDFStore((s) => s.setPdfUri);

  const handlePressButton = useCallback(async () => {
    if (uri) {
      setUriState("");
      try {
        new ExpoFileSystem.File(uri).delete();
      } catch {
        // Ignore errors
      }
    } else {
      const pick = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        multiple: false,
      });
      if (pick.canceled) return;

      setUriState(pick.assets[0].uri);
    }
  }, [uri, setUriState]);

  useEffect(() => {
    if (REPLACERS.isWeb) return;

    if (!uri || (!uri.startsWith("file://") && !uri.startsWith("content://")))
      return;
    const filename = uri.split("/").pop();
    if (!filename) {
      REPLACERS.Logger.error("Failed to extract filename from URI:", uri);
      return;
    }

    const encodedUri = encodeURI(uri);

    const outputPath = new ExpoFileSystem.Directory(
      ExpoFileSystem.Paths.cache,
      sanitizeFileName(filename),
    );
    const cacheFile = new ExpoFileSystem.File(outputPath);
    const copiedFile = new ExpoFileSystem.File(encodedUri);
    cacheFile.copy(copiedFile);

    if (cacheFile.info()?.exists) {
      const cacheFilePath = URI_EXTENSION + outputPath;

      setUriState(cacheFilePath);
    }

    return () => {
      try {
        cacheFile.delete();
      } catch {
        // Ignore errors
      }
    };
  }, [uri, setUriState]);

  return (
    <View style={styles.container}>
      <Button mode="contained" onPress={handlePressButton}>
        {t(uri ? "pdf.close" : "pdf.open")}
      </Button>

      <Divider style={styles.divider} />

      {!!uri && (
        <PDF
          enableAntialiasing
          enableDoubleTapZoom
          style={styles.pdf}
          source={{ uri: uri || "" }}
          maxScale={20}
          minScale={0.5}
          fitPolicy={2}
        />
      )}
    </View>
  );
};

export default memoDeep(Viewer);
