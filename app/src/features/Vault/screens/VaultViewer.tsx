import Modal from "../components/Modal";
import ItemViewer from "../components/ItemViewer";
import { useVault } from "@screens/Vault/context/VaultContext";
import { REPLACERS } from "@utils";
import { FolderFiles } from "@types";
import { useLanguage } from "@context/LanguageContext";
import { VaultScreenProps } from ".";
import React, { useCallback, useRef } from "react";
import ActionsMenu, { defaultMenuState } from "../components/ActionsMenu";
import { List, Menu, Text, Button, Divider } from "react-native-paper";
import { View, FlatList, GestureResponderEvent } from "react-native";

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

export type OnLongPressRef = React.RefObject<
  (event: GestureResponderEvent, item: FolderFiles[number]) => void
>;

const VaultViewer: React.FC<VaultScreenProps> = ({ useStylesVaultScreen }) => {
  const { t } = useLanguage();

  const returnVault = useVault();

  const { folders, functionsRef, currentFolderId, setCurrentFolderId } =
    returnVault;

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

  const onLongPressRef: OnLongPressRef = useRef((event, item) => {
    if (dataRef.current.renderModal.type === "video") return;

    const { pageX, pageY } = event.nativeEvent;
    setMenu({
      x: pageX,
      y: pageY,
      item,
      visible: true,
    });
  });

  const onLongPressFolderRef = useRef(
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
  );

  const renderItemRef = useRef(({ item }: { item: FolderFiles[number] }) => {
    return (
      <ItemViewer
        item={item}
        onLongPressRef={onLongPressRef}
        setRenderModal={setRenderModal}
      />
    );
  });

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

  const renderItemFolder = useCallback(
    ({ item }: { item: [string, FolderFiles | "locked"] }) => {
      const [folderName, files] = item;

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
          key={folderName}
          style={styles.folderItem}
          onPress={() => {
            setCurrentFolderId(folderName);
          }}
          onLongPress={(event) =>
            onLongPressFolderRef.current(event, folderName)
          }
        >
          <List.Icon style={styles.folderIcon} icon={icon} color={"#666"} />
          <Text style={styles.folderName}>{folderName}</Text>
        </Button>
      );
    },
    [functionsRef, setCurrentFolderId, styles],
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
        onDismiss={onDismissRef.current}
        renderModal={renderModal}
        onLongPress={onLongPressRef.current}
        setRenderModal={setRenderModal}
        useStylesVaultScreen={useStylesVaultScreen}
      />

      <Text style={styles.title}>{t("vault.viewer.title")}</Text>

      <FlatList
        style={styles.foldersList}
        contentContainerStyle={styles.content}
        horizontal
        data={Object.entries(folders)}
        renderItem={renderItemFolder}
      />

      <Divider style={styles.margin8} />

      <FlatList
        data={
          Array.isArray(folders[currentFolderId])
            ? folders[currentFolderId]
            : []
        }
        numColumns={REPLACERS.isWeb ? 4 : 3}
        renderItem={renderItemRef.current}
        keyExtractor={(item) => item.originalUri || item.uri}
        ListEmptyComponent={renderEmptyOrLocked}
        contentContainerStyle={styles.filesViewerList}
      />
    </View>
  );
};

export default VaultViewer;
