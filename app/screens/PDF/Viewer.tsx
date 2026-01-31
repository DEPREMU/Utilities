import { View } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { useStylesPDF } from "@styles/screens/PDF/useStylesPDF";
import * as ExpoFileSystem from "expo-file-system";
import { Button, Divider } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  PDF,
  logger,
  memoDeep,
  RNFSModule,
  URI_EXTENSION,
  sanitizeFileName,
  REPLACERS,
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

    const encodedUri = encodeURI(uri);

    const filename = uri.split("/").pop() || "document.pdf";
    const outputPath = `${RNFSModule.CachesDirectoryPath}/${sanitizeFileName(filename)}`;

    RNFSModule.copyFile(encodedUri, outputPath)
      .then(async () => {
        if (await RNFSModule.exists(outputPath)) {
          const cacheFilePath = URI_EXTENSION + outputPath;

          setUriState(cacheFilePath);
        }
      })
      .catch((error) => {
        logger.error("PDF", "Error copying file to cache", error);
      });

    return () => {
      try {
        RNFSModule.unlink(outputPath);
      } catch {
        // Ignore errors
      }
    };
  }, [uri]);

  return (
    <View style={styles.container}>
      <Button mode="contained" onPress={handlePressButton}>
        {t(uriState ? "PDF.close" : "PDF.open")}
      </Button>

      <Divider style={styles.divider} />

      {uriState && (
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
