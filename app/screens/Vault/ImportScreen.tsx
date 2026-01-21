import {
  List,
  Text,
  Button,
  Divider,
  TextInput,
  IconButton,
  ProgressBar,
  RadioButton,
} from "react-native-paper";
import { useVault } from "@context/VaultContext";
import { useLanguage } from "@context/LanguageContext";
import { VaultScreenProps } from ".";
import { ScrollView, View, Image } from "react-native";
import React, { useCallback, useState } from "react";
import { DownloadableMimeType, typeLanguagesKeys } from "@types";

type Item = {
  title: typeLanguagesKeys;
  flag: "files" | "folders";
};

const ITEMS_IMPORT: Item[] = [
  {
    title: "vault.import.selectFiles",
    flag: "files",
  },
  {
    title: "vault.import.selectFolders",
    flag: "folders",
  },
];

const ImportScreen: React.FC<VaultScreenProps> = ({ useStylesVaultScreen }) => {
  const { t } = useLanguage();
  const { styles } = useStylesVaultScreen;
  const {
    files,
    functionsRef,
    filesUploading,
    currentFolderId,
    setCurrentFolderId,
  } = useVault();

  const [preflight, setPreflight] = useState<"files" | "folders">("files");

  const renderFileType = useCallback(
    (mimeType: DownloadableMimeType | null, uri: string) => {
      if (!mimeType) return <List.Icon style={styles.iconLeft} icon="file" />;

      const type = mimeType.toLowerCase().split("/")[0];

      let icon = "file";

      switch (type) {
        case "video":
          icon = "video";
          break;
        case "audio":
          icon = "music";
          break;
        case "application":
          if (mimeType === "application/pdf") icon = "file-pdf-box";
          else if (
            mimeType === "application/zip" ||
            mimeType === "application/x-rar-compressed"
          )
            icon = "folder-zip";
          break;
        default:
          icon = "file";
      }

      if (mimeType.startsWith("image/"))
        return <Image source={{ uri }} style={styles.iconLeft} />;

      return <List.Icon icon={icon} style={styles.iconLeft} />;
    },
    [styles.iconLeft],
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("vault.import.title")}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("vault.import.preflight")}</Text>

        {ITEMS_IMPORT.map((item) => (
          <List.Item
            key={item.flag}
            title={t(item.title)}
            onPress={() => setPreflight(item.flag)}
            right={() => (
              <RadioButton
                value={item.flag}
                status={preflight === item.flag ? "checked" : "unchecked"}
                onPress={() => setPreflight(item.flag)}
              />
            )}
          />
        ))}

        <Divider />

        <TextInput
          value={currentFolderId}
          label={t("vault.import.folderName")}
          onChangeText={setCurrentFolderId}
        />

        <Button mode="contained" onPress={functionsRef.current.pickFiles}>
          {t("vault.import.import")}
        </Button>
      </View>

      {files.length > 0 && (
        <>
          <Divider style={styles.margin8} />

          <View style={styles.section}>
            <ScrollView style={styles.filesList}>
              {files.map((file, i) => (
                <View key={i}>
                  <List.Item
                    title={file.name}
                    description={file.uri}
                    left={() => renderFileType(file.mimeType, file.uri)}
                    right={() => (
                      <IconButton
                        icon="delete"
                        onPress={() => functionsRef.current.removeFile(file)}
                      />
                    )}
                  />
                  {!!filesUploading[file.uri] && (
                    <ProgressBar progress={filesUploading[file.uri] / 100} />
                  )}
                </View>
              ))}
            </ScrollView>
            <Button
              mode="contained"
              onPress={functionsRef.current.encryptFiles}
            >
              {t("vault.import.encryptFiles")}
            </Button>
          </View>
        </>
      )}
    </View>
  );
};

export default ImportScreen;
