import {
  View,
  Image,
  Platform,
  FlatList,
  Pressable,
  ScrollView,
  GestureResponderEvent,
} from "react-native";
import Modal from "./components/Modal";
import ActionsMenu from "./components/ActionsMenu";
import { useVault } from "@context/VaultContext";
import { FolderFiles } from "@types";
import { useLanguage } from "@context/LanguageContext";
import { VaultScreenProps } from ".";
import React, { useCallback, useRef } from "react";
import { List, Menu, Text, Button, Divider } from "react-native-paper";

export type ModalData = {
  show: boolean;
  item: FolderFiles[number];
  type: "none" | "text" | "image" | "video" | "info" | "pdf";
};

export type Menu = {
  visible: boolean;
  x: number;
  y: number;
  item: FolderFiles[number] | null;
  folderId?: string;
};

export type DataVaultViewer = { renderModal: ModalData; menu: Menu };

const defaultModalData: ModalData = {
  type: "none",
  show: false,
  item: {} as FolderFiles[number],
};

export const defaultMenuState: Menu = {
  x: 0,
  y: 0,
  item: null,
  visible: false,
};

const VaultViewer: React.FC<VaultScreenProps> = ({ useStylesVaultScreen }) => {
  const { t } = useLanguage();

  const returnVault = useVault();

  const {
    folders,
    functionsRef,
    filesSelected,
    currentFolderId,
    setCurrentFolderId,
  } = returnVault;

  const { styles } = useStylesVaultScreen;

  const [renderModal, setRenderModal] =
    React.useState<ModalData>(defaultModalData);
  const [menu, setMenu] = React.useState<Menu>(defaultMenuState);

  const dataRef = React.useRef<DataVaultViewer>({
    menu,
    renderModal,
  });
  dataRef.current = { renderModal, menu };

  const onDismissRef = useRef(() => {
    setRenderModal(defaultModalData);
  });
  const onLongPressRef = useRef(
    (event: GestureResponderEvent, item: FolderFiles[number]) => {
      if (dataRef.current.renderModal.type === "video") return;

      const { pageX, pageY } = event.nativeEvent;
      setMenu({
        x: pageX,
        y: pageY,
        item,
        visible: true,
      });
    },
  );

  const renderEmptyOrLocked = useCallback(() => {
    if (folders[currentFolderId] === "locked") {
      return (
        <View style={styles.lockedScreen}>
          <Text style={styles.lockedTitle}>
            {t("vault.viewer.lockedTitle")}
          </Text>
          <Button mode="contained" onPress={functionsRef.current.unlockFolder}>
            {t("vault.unlock")}
          </Button>
        </View>
      );
    } else {
      return (
        <View style={styles.lockedScreen}>
          <Text style={styles.lockedMessage}>{t("common.empty")}</Text>
        </View>
      );
    }
  }, [styles, t, folders, currentFolderId, functionsRef]);

  const renderItem = useCallback(
    ({ item }: { item: FolderFiles[number] }) => {
      const currentFolderId = functionsRef.current.getCurrentFolderId();
      const isSelected = !!filesSelected.files[currentFolderId]?.[item.uri];

      const onPress = () => {
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
      };

      return (
        <Pressable
          style={[styles.fileItem, isSelected ? styles.fileItemSelected : {}]}
          onPress={onPress}
          onLongPress={(event) => onLongPressRef.current(event, item)}
          delayLongPress={300}
        >
          {item.mimeType?.startsWith("image/") ? (
            <Image
              style={[
                styles.fileItem,
                isSelected ? styles.fileItemSelected : {},
              ]}
              source={{ uri: item.uri }}
            />
          ) : item.mimeType?.startsWith("video/") ? (
            <>
              <List.Icon style={styles.iconLeft} icon="video" />
              <Text style={styles.fileName} numberOfLines={1}>
                {item.name}
              </Text>
            </>
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
    },
    [styles, filesSelected, functionsRef],
  );

  const onLongPress = useCallback(
    (event: GestureResponderEvent, folderId: string) => {
      const x = event.nativeEvent.pageX;
      const y = event.nativeEvent.pageY;

      setMenu({
        x,
        y,
        item: null,
        folderId,
        visible: true,
      });
    },
    [],
  );

  return (
    <View style={styles.container}>
      <ActionsMenu
        menu={menu}
        setMenu={setMenu}
        dataRef={dataRef}
        setRenderModal={setRenderModal}
        onDismissModal={onDismissRef.current}
        useStylesVaultScreen={useStylesVaultScreen}
      />

      <Modal
        dataRef={dataRef}
        onDismiss={onDismissRef.current}
        renderModal={renderModal}
        onLongPress={onLongPressRef.current}
        setRenderModal={setRenderModal}
        useStylesVaultScreen={useStylesVaultScreen}
      />

      <Text style={styles.title}>{t("vault.viewer.title")}</Text>

      <ScrollView
        style={styles.foldersList}
        contentContainerStyle={styles.content}
        horizontal
      >
        {Object.entries(folders).map(([folderName, files], i) => {
          let icon = "folder-lock";
          const isCurrent =
            functionsRef.current.getCurrentFolderId() === folderName;

          if (files === "locked") {
            if (isCurrent) icon = "folder-lock-outline";
          } else {
            if (isCurrent) icon = "folder";
            else icon = "folder-outline";
          }

          return (
            <Button
              key={i}
              style={styles.folderItem}
              onPress={() => {
                setCurrentFolderId(folderName);
              }}
              onLongPress={(event) => onLongPress(event, folderName)}
            >
              <List.Icon style={styles.folderIcon} icon={icon} color={"#666"} />
              <Text style={styles.folderName}>{folderName}</Text>
            </Button>
          );
        })}
      </ScrollView>

      <Divider style={styles.margin8} />

      <FlatList
        data={
          Array.isArray(folders[currentFolderId])
            ? folders[currentFolderId]
            : []
        }
        numColumns={Platform.OS === "web" ? 4 : 3}
        renderItem={renderItem}
        keyExtractor={(_, index) => String(index)}
        ListEmptyComponent={renderEmptyOrLocked}
        contentContainerStyle={styles.filesViewerList}
      />
    </View>
  );
};

export default VaultViewer;
