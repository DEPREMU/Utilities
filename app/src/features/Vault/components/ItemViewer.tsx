import { useVault } from "../context/VaultContext";
import { List, Text } from "react-native-paper";
import { FolderFiles } from "@types";
import { Image, Pressable } from "react-native";
import useStylesVaultScreen from "../styles/useStylesVaultScreen";
import React, { useCallback } from "react";
import { ModalData, OnLongPressRef } from "../screens/VaultViewer";

interface ItemViewerProps {
  item: FolderFiles[number];
  setRenderModal: React.Dispatch<React.SetStateAction<ModalData>>;
  onLongPressRef: OnLongPressRef;
}

const getFileSelectionKey = (item: FolderFiles[number]) => {
  return item.originalUri || item.uri;
};

const ItemViewer: React.FC<ItemViewerProps> = ({
  item,
  setRenderModal,
  onLongPressRef,
}) => {
  const { styles } = useStylesVaultScreen();
  const { filesSelected, functionsRef } = useVault();

  const currentFolderId = functionsRef.current.getCurrentFolderId();
  const fileKey = getFileSelectionKey(item);
  const isSelected = !!filesSelected.files[currentFolderId]?.[fileKey];

  const onPress = useCallback(() => {
    if (item.decrypting) return;

    if (filesSelected.selecting || isSelected) {
      functionsRef.current.selectFile(item);
      return;
    }

    const mimeType = item.mimeType || "none";
    let typeMain: ModalData["type"] = mimeType.split("/")[0] as "image";

    if (mimeType === "application/pdf") typeMain = "pdf";

    setRenderModal({
      item,
      show: true,
      type: typeMain,
    });
  }, [item, filesSelected, isSelected, functionsRef, setRenderModal]);

  return (
    <Pressable
      style={[styles.fileItem, isSelected ? styles.fileItemSelected : {}]}
      onPress={onPress}
      onLongPress={(event) => onLongPressRef.current(event, item)}
      delayLongPress={300}
    >
      {item.mimeType?.startsWith("image/") ? (
        item.decrypting || !item.uri ? (
          <>
            <List.Icon style={styles.iconLeft} icon="image" />
            <Text style={styles.fileName} numberOfLines={1}>
              {item.name}
            </Text>
          </>
        ) : (
          <Image
            style={[styles.fileItem, isSelected ? styles.fileItemSelected : {}]}
            source={{ uri: item.uri }}
          />
        )
      ) : item.mimeType?.startsWith("video/") ? (
        item.previewUri ? (
          <Image
            style={[styles.fileItem, isSelected ? styles.fileItemSelected : {}]}
            source={{ uri: item.previewUri }}
          />
        ) : (
          <>
            <List.Icon style={styles.iconLeft} icon="video" />
            <Text style={styles.fileName} numberOfLines={1}>
              {item.name}
            </Text>
          </>
        )
      ) : (
        <>
          <List.Icon style={styles.iconLeft} icon="file" />
          <Text style={styles.fileName} numberOfLines={1}>
            {item.name}
          </Text>
        </>
      )}
    </Pressable>
  );
};

export default ItemViewer;
