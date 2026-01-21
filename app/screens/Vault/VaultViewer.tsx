import {
  List,
  Menu,
  Text,
  Button,
  Divider,
  TextInput,
} from "react-native-paper";
import {
  View,
  Image,
  Platform,
  FlatList,
  Pressable,
  ScrollView,
  GestureResponderEvent,
} from "react-native";
import ModalInfo from "./components/ModalInfo";
import { clearRefs, tTyped } from "@utils";
import { useModal } from "@context/ModalContext";
import { useVault } from "@context/VaultContext";
import { cloneDeep } from "lodash";
import { useLanguage } from "@context/LanguageContext";
import ModalVideoImage from "./components/ModalVideoImage";
import { VaultScreenProps } from ".";
import React, { useCallback, useEffect } from "react";
import { PickedFile, FolderFiles } from "@types";

export type ModalData = {
  show: boolean;
  item: PickedFile;
  type: "none" | "text" | "image" | "video" | "info";
};

export type Menu = {
  visible: boolean;
  x: number;
  y: number;
  item: FolderFiles[number] | null;
};

const defaultModalData: ModalData = {
  type: "text",
  show: false,
  item: {} as PickedFile,
};

const defaultMenuState: Menu = {
  x: 0,
  y: 0,
  item: null,
  visible: false,
};

type Action = {
  action:
    | "info"
    | "select"
    | "rename"
    | "delete"
    | "copyToFolder"
    | "moveToFolder"
    | "selectFromLastToHere";
  icon: string;
};

const ACTIONS_MENU: Action[] = [
  {
    icon: "select",
    action: "select",
  },
  {
    icon: "select-multiple",
    action: "selectFromLastToHere",
  },
  {
    icon: "folder-move",
    action: "copyToFolder",
  },
  {
    icon: "folder-move",
    action: "moveToFolder",
  },
  {
    icon: "pencil",
    action: "rename",
  },
  {
    icon: "information",
    action: "info",
  },
  {
    icon: "delete",
    action: "delete",
  },
];

const devData: FolderFiles = [
  {
    name: "Sample Image",
    uri: "https://www.techsmith.com/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
    mimeType: "image/png",
    size: 1024 * 500,
    originalUri: "",
  },
  {
    name: "Sample Video",
    uri: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
    mimeType: "video/mp4",
    size: 1024 * 1024 * 5,
    originalUri: "",
  },
]; //! DELETE

const VaultViewer: React.FC<VaultScreenProps> = ({ useStylesVaultScreen }) => {
  const {
    folders,
    statesRef,
    functionsRef,
    filesSelected,
    currentFolderId,
    setFilesSelected,
    setCurrentFolderId,
  } = useVault();
  const { t } = useLanguage();
  const { styles } = useStylesVaultScreen;
  const { openModalRef, closeModalRef } = useModal();

  const [renderModal, setRenderModal] =
    React.useState<ModalData>(defaultModalData);
  const [menu, setMenu] = React.useState<Menu>(defaultMenuState);

  const dataRef = React.useRef<{ renderModal: ModalData; menu: Menu }>({
    menu,
    renderModal,
  });
  dataRef.current = { renderModal, menu };

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
      const isSelected = filesSelected.files[currentFolderId]?.[item.uri];

      const onLongPress = (event: GestureResponderEvent) => {
        const { pageX, pageY } = event.nativeEvent;
        setMenu({
          x: pageX,
          y: pageY,
          item,
          visible: true,
        });
      };

      const onPress = () => {
        if (isSelected)
          setFilesSelected((prev) => {
            const updated = cloneDeep(prev);
            delete updated.files[currentFolderId][item.uri];
            if (!Object.keys(updated.files[currentFolderId]).length)
              delete updated.files[currentFolderId];

            return updated;
          });
        else if (filesSelected.selecting)
          setFilesSelected((prev) => {
            const updated = cloneDeep(prev);
            if (!updated.files[currentFolderId])
              updated.files[currentFolderId] = {};
            updated.files[currentFolderId][item.uri] = true;
            return updated;
          });
        else
          setRenderModal({
            item,
            show: true,
            type: item.mimeType?.split("/")[0] as "image",
          });
      };

      return (
        <Pressable
          style={[styles.fileItem, isSelected ? styles.fileItemSelected : {}]}
          onPress={onPress}
          onLongPress={onLongPress}
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
    [styles, filesSelected, setFilesSelected, functionsRef],
  );

  const handlePressByAction = useCallback(
    (action: Action["action"], item: FolderFiles[number] | null) => {
      setMenu(defaultMenuState);

      if (!item) return;

      const onDismiss = () => {
        closeModalRef.current();
      };

      switch (action) {
        case "info":
          setRenderModal({ show: true, item, type: "info" });
          break;
        case "delete": {
          openModalRef.current(
            tTyped("vault.modal.deleteTitle"),
            tTyped("vault.modal.deleteMessage", { name: item.name }),
            <>
              <Button mode="outlined" onPress={() => closeModalRef.current()}>
                {tTyped("labels.cancel")}
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  functionsRef.current.deleteFile(item);
                  closeModalRef.current();
                }}
              >
                {tTyped("common.delete")}
              </Button>
            </>,
          );
          break;
        }
        case "rename": {
          let newName = item.name;
          openModalRef.current(
            tTyped("vault.menu.rename"),
            <View style={styles.modalScrollView}>
              <Text style={styles.modalText}>
                {tTyped("vault.modal.renameMessage")}
              </Text>

              <Divider style={styles.margin8} />

              <TextInput
                label={tTyped("vault.modal.enterNewName")}
                defaultValue={item.name}
                onChangeText={(text) => (newName = text)}
              />
            </View>,
            <>
              <Button mode="outlined" onPress={onDismiss}>
                {tTyped("labels.cancel")}
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  closeModalRef.current();
                  openModalRef.current(
                    tTyped("vault.modal.renameConfirmTitle"),
                    <View style={styles.modalScrollView}>
                      <Text style={styles.modalText}>
                        {tTyped("vault.modal.renameConfirmMessage", {
                          oldName: item.name,
                          newName: newName || item.name,
                        })}
                      </Text>
                    </View>,
                    <>
                      <Button mode="outlined" onPress={onDismiss}>
                        {tTyped("labels.cancel")}
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => {
                          functionsRef.current.renameFile(
                            item,
                            newName || item.name,
                          );
                          onDismiss();
                        }}
                      >
                        {tTyped("common.confirm")}
                      </Button>
                    </>,
                  );
                }}
              >
                {tTyped("vault.menu.rename")}
              </Button>
            </>,
          );
          break;
        }
        case "moveToFolder":
        case "copyToFolder": {
          const currentFolderId = functionsRef.current.getCurrentFolderId();

          openModalRef.current(
            tTyped(`vault.menu.${action}`),
            <ScrollView style={styles.modalScrollView}>
              {Object.entries(statesRef.current.folders).map(
                ([folderName, files], i) => {
                  if (folderName === currentFolderId) return null;
                  return (
                    <List.Item
                      key={i}
                      title={folderName}
                      left={() => (
                        <List.Icon
                          style={styles.iconLeft}
                          icon={files === "locked" ? "folder-lock" : "folder"}
                        />
                      )}
                      onPress={() => {
                        functionsRef.current.actionWithFile(
                          action === "moveToFolder" ? "move" : "copy",
                          item,
                          folderName,
                        );
                        closeModalRef.current();
                      }}
                    />
                  );
                },
              )}
            </ScrollView>,
            <Button mode="contained" onPress={onDismiss}>
              {tTyped("labels.cancel")}
            </Button>,
            onDismiss,
          );
          break;
        }
        case "select": {
          const currentFolderId = functionsRef.current.getCurrentFolderId();
          setFilesSelected((prev) => {
            const updated = cloneDeep(prev);
            updated.selecting = true;

            if (updated.files[currentFolderId]?.[item.uri]) {
              delete updated.files[currentFolderId][item.uri];
              if (!Object.keys(updated.files[currentFolderId]).length)
                delete updated.files[currentFolderId];
              return updated;
            }

            if (!updated.files[currentFolderId])
              updated.files[currentFolderId] = {};
            updated.files[currentFolderId][item.uri] = true;
            return updated;
          });
          break;
        }
        case "selectFromLastToHere": {
          const currentFolderId = functionsRef.current.getCurrentFolderId();
          const folderFiles = statesRef.current.folders[
            currentFolderId
          ] as PickedFile[];
          const selectedFilesMap =
            statesRef.current.filesSelected.files[currentFolderId] || {};

          const lastSelectedIndex = folderFiles.findIndex((file) =>
            Object.keys(selectedFilesMap).includes(file.uri),
          );
          const currentIndex = folderFiles.findIndex(
            (file) => file.uri === item.uri,
          );

          if (lastSelectedIndex === -1) {
            // If no previous selection, just select the current item
            setFilesSelected((prev) => {
              const updated = cloneDeep(prev);
              if (!updated.files[currentFolderId])
                updated.files[currentFolderId] = {};
              updated.files[currentFolderId][item.uri] = true;
              return updated;
            });
          } else {
            const [start, end] =
              lastSelectedIndex < currentIndex
                ? [lastSelectedIndex, currentIndex]
                : [currentIndex, lastSelectedIndex];

            const itemsToSelect = folderFiles.slice(start, end + 1);

            setFilesSelected((prev) => {
              const updated = cloneDeep(prev);
              if (!updated.files[currentFolderId])
                updated.files[currentFolderId] = {};
              itemsToSelect.forEach((file) => {
                updated.files[currentFolderId][file.uri] = true;
              });
              return updated;
            });
          }
          break;
        }
      }
    },
    [
      styles,
      statesRef,
      openModalRef,
      functionsRef,
      closeModalRef,
      setFilesSelected,
    ],
  );

  const actionsMenu = useCallback(
    () =>
      ACTIONS_MENU.map((action) => {
        let title = "";
        if (
          action.action === "copyToFolder" ||
          action.action === "moveToFolder"
        ) {
          const folderCount = Object.keys(folders).length;
          if (folderCount <= 1) return null;
        } else if (
          action.action === "select" ||
          action.action === "selectFromLastToHere"
        ) {
          const currentFolderId = functionsRef.current.getCurrentFolderId();
          const folderFiles = statesRef.current.folders[currentFolderId];

          if (folderFiles === "locked") return null;

          const isSelected =
            statesRef.current.filesSelected.files[currentFolderId]?.[
              dataRef.current.menu.item?.uri || ""
            ];
          if (isSelected && action.action === "select") {
            title = tTyped("labels.deselect");
          } else if (!isSelected && action.action === "selectFromLastToHere") {
            const currentIndex = folderFiles.findIndex(
              (f) => f.uri === dataRef.current.menu.item?.uri,
            );
            const lastSelectedIndex = folderFiles.findIndex((file) =>
              Object.keys(
                statesRef.current.filesSelected.files[currentFolderId] || {},
              ).includes(file.uri),
            );

            if (lastSelectedIndex === -1 || currentIndex === -1) return null;

            if (
              (lastSelectedIndex < currentIndex &&
                currentIndex - lastSelectedIndex === 1) ||
              (lastSelectedIndex > currentIndex &&
                lastSelectedIndex - currentIndex === 1)
            )
              return null;

            title = tTyped("vault.menu.selectFromLastToHere");
          } else if (isSelected && action.action === "selectFromLastToHere") {
            return null;
          }
        }

        return (
          <Menu.Item
            key={action.action}
            title={title || tTyped(`vault.menu.${action.action}`)}
            onPress={() =>
              handlePressByAction(action.action, dataRef.current.menu.item)
            }
            leadingIcon={action.icon}
          />
        );
      }),
    [handlePressByAction, folders, statesRef, functionsRef],
  );

  const onDismiss = useCallback(() => setRenderModal(defaultModalData), []);

  useEffect(() => () => clearRefs(dataRef), []);

  return (
    <View style={styles.container}>
      {(renderModal.type === "image" || renderModal.type === "video") && (
        <ModalVideoImage
          dataRef={dataRef}
          onDismiss={onDismiss}
          renderModal={renderModal}
          setRenderModal={setRenderModal}
          useStylesVaultScreen={useStylesVaultScreen}
        />
      )}

      {renderModal.type === "info" && (
        <ModalInfo
          item={renderModal.item}
          onDismiss={onDismiss}
          useStylesVaultScreen={useStylesVaultScreen}
        />
      )}

      {menu.visible && (
        <Menu
          visible={menu.visible}
          onDismiss={() => setMenu(defaultMenuState)}
          anchor={{ x: menu.x, y: menu.y }}
        >
          {actionsMenu()}
        </Menu>
      )}

      <Text style={styles.title}>{t("vault.viewer.title")}</Text>

      <ScrollView
        style={styles.foldersList}
        contentContainerStyle={styles.content}
        horizontal
      >
        {Object.entries(folders).map(([folderName, files], i) => (
          <Button
            key={i}
            style={styles.folderItem}
            onPress={() => {
              setCurrentFolderId(folderName);
            }}
          >
            <List.Icon
              style={styles.folderIcon}
              icon={files === "locked" ? "folder-lock" : "folder"}
              color={"#666"}
            />
            <Text style={styles.folderName}>{folderName}</Text>
          </Button>
        ))}
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
