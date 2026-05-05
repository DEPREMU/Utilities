import { View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { useStylesPDF } from "@/features/PDF/styles/useStylesPDF";
import * as ExpoFileSystem from "expo-file-system";
import { Button, Divider } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  PDF,
  logger,
  memoDeep,
  REPLACERS,
  URI_EXTENSION,
  sanitizeFileName,
} from "@utils";

type ViewerProps = {
  uri?: string;
};

const Viewer: React.FC<ViewerProps> = ({ uri }) => {
  const { t } = useLanguage();
  const { styles } = useStylesPDF();

  const [uriState, setUriState] = useState<string>("");

  const handlePressButton = useCallback(async () => {
    if (uriState) {
      setUriState("");
      try {
        new ExpoFileSystem.File(uriState).delete();
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
  }, [uriState]);

  useEffect(() => {
    if (REPLACERS.isWeb) return;

    if (!uri || (!uri.startsWith("file://") && !uri.startsWith("content://")))
      return;
    const filename = uri.split("/").pop();
    if (!filename) {
      logger.error("Failed to extract filename from URI:", uri);
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
  }, [uri]);

  return (
    <View style={styles.container}>
      <Button mode="contained" onPress={handlePressButton}>
        {t(uriState ? "pdf.close" : "pdf.open")}
      </Button>

      <Divider style={styles.divider} />

      {!!uriState && (
        <PDF
          enableAntialiasing
          enableDoubleTapZoom
          style={styles.pdf}
          source={{ uri: uriState || "" }}
          maxScale={20}
          minScale={0.5}
          fitPolicy={2}
        />
      )}
    </View>
  );
};

export default memoDeep(Viewer);
