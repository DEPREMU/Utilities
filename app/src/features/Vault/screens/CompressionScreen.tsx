import {
  List,
  Text,
  Button,
  Divider,
  TextInput,
  ProgressBar,
} from "react-native-paper";
import { View } from "react-native";
import { modalRef } from "@refs";
import { useVault } from "@screens/Vault/context/VaultContext";
import { REPLACERS } from "@common";
import { shareAsync } from "expo-sharing";
import { useLanguage } from "@context/LanguageContext";
import { windowModule } from "@modules";
import { useStylesVaultScreen } from "../styles/useStylesVaultScreen";
import { FolderFiles, tTyped, zipFile } from "@utils";
import React, { useCallback, useMemo, useState } from "react";

const getFileSelectionKey = (item: FolderFiles[number]) => {
  return item.originalUri || item.uri;
};

const CompressionScreen: React.FC = () => {
  const { t } = useLanguage();
  const { functionsRef, statesRef, filesSelected } = useVault();
  const { styles } = useStylesVaultScreen();

  const [progress, setProgress] = useState(0);

  const handlePressZip = useCallback(async () => {
    const folderId = functionsRef.current.getCurrentFolderId();
    const folders = statesRef.current.filesSelected.files;

    const isSelecting = statesRef.current.filesSelected.selecting;

    let files: string[];

    if (isSelecting) {
      files = Object.values(folders)
        .map((f) => Object.keys(f))
        .flat();
    } else {
      const filesInFolder = statesRef.current.folders[folderId];
      if (!filesInFolder || filesInFolder === "locked") return;

      files = filesInFolder.map((f) => f.uri);
    }

    if (!files.length) return;

    const password = await new Promise<string>((resolve) => {
      let pass = "";

      modalRef.openModal?.(
        tTyped("auth.passwordPlaceholder"),
        <View style={styles.modalContainer}>
          <Text style={styles.modalText}>
            {tTyped("vault.modal.enterPasswordZipMessage")}
          </Text>

          <TextInput
            secureTextEntry
            style={styles.modalTextInput}
            label={tTyped("auth.passwordPlaceholder")}
            onChangeText={(text) => (pass = text)}
            defaultValue=""
          />
        </View>,
        <>
          <Button
            mode="contained"
            onPress={() => {
              resolve(pass);
              modalRef.closeModal?.();
            }}
          >
            {t("common.confirm")}
          </Button>
          <Button
            mode="text"
            onPress={() => {
              resolve("");
              modalRef.closeModal?.();
            }}
          >
            {t("labels.cancel")}
          </Button>
        </>,
        () => resolve(""),
      );
    });

    let pathZip;

    if (REPLACERS.isWeb) {
      const path = await windowModule.askPath();
      if (!path) return;

      pathZip = await windowModule.zipFolder(
        files,
        { path, folderName: folderId },
        password || undefined,
        (progressPercent) => {
          setProgress(progressPercent / 100);
        },
        (error) => {
          REPLACERS.Logger.error("VAULT", "Error zipping folder:", error);
        },
      );
    } else {
      pathZip = await zipFile(
        files,
        setProgress,
        password || undefined,
        async (pathZip, deleteTempFile) => {
          try {
            await shareAsync(pathZip, {
              mimeType: "application/zip",
            });
            deleteTempFile();
          } catch (error) {
            REPLACERS.Logger.error("SHARE", "Error sharing zip file:", error);
          }
        },
      );
    }

    setProgress(1);
    modalRef.openModal?.(
      tTyped("common.success"),
      <View style={styles.modalContainer}>
        <Text style={styles.modalText}>
          {tTyped("vault.modal.compressionSuccessMessage", { path: pathZip })}
        </Text>
      </View>,
      <Button mode="contained" onPress={() => modalRef.closeModal?.()}>
        {t("labels.continue")}
      </Button>,
    );
  }, [functionsRef, statesRef, styles, t]);

  const files: FolderFiles = useMemo(() => {
    const isSelecting = filesSelected.selecting;

    if (isSelecting) {
      const folders = filesSelected.files;
      const selected = Object.values(folders)
        .map((f) => Object.keys(f))
        .flat();

      const folderFiles = selected.map((fileUri) => {
        const folderId = Object.keys(folders).find((fid) =>
          Object.prototype.hasOwnProperty.call(folders[fid], fileUri),
        );

        if (!folderId) return null;

        const filesInFolder = statesRef.current.folders[folderId];
        if (!filesInFolder || filesInFolder === "locked") return null;

        const file = filesInFolder.find(
          (f) => getFileSelectionKey(f) === fileUri,
        );
        return file || null;
      });

      return folderFiles.filter((f): f is FolderFiles[number] => f !== null);
    } else {
      const folderId = functionsRef.current.getCurrentFolderId();
      const filesInFolder = statesRef.current.folders[folderId];
      if (!filesInFolder || filesInFolder === "locked") return [];
      return filesInFolder;
    }
  }, [filesSelected, functionsRef, statesRef]);

  return (
    <View style={styles.container}>
      <Button mode="contained" onPress={handlePressZip}>
        {t("common.compress")}
      </Button>

      <Divider style={styles.margin8} />

      <View style={styles.section}>
        <ProgressBar progress={progress} style={styles.progressBar} />

        {files.map((file, index) => (
          <View key={index} style={styles.modalInfoRow}>
            <List.Icon icon="file" style={styles.iconLeft} />

            <Text style={styles.fileName} numberOfLines={1}>
              {file.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default CompressionScreen;
