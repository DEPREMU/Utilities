import {
  List,
  Menu,
  Text,
  Button,
  Divider,
  TextInput,
} from "react-native-paper";
import { useModal } from "@context/ModalContext";
import { useVault } from "@context/VaultContext";
import { cloneDeep } from "lodash";
import { ScrollView, View } from "react-native";
import useStylesVaultScreen from "@styles/screens/useStylesVaultScreen";
import React, { useCallback } from "react";
import { FolderFiles, memoDeep, PickedFile, tTyped } from "@utils";
import {
  ModalData,
  DataVaultViewer,
  defaultMenuState,
  Menu as MenuType,
} from "../VaultViewer";

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

interface ActionsMenuProps {
  menu: MenuType;
  setMenu: React.Dispatch<React.SetStateAction<MenuType>>;
  dataRef: React.RefObject<DataVaultViewer>;
  onDismissModal: () => void;
  setRenderModal: React.Dispatch<React.SetStateAction<ModalData>>;
  useStylesVaultScreen: ReturnType<typeof useStylesVaultScreen>;
}

const ActionsMenu: React.FC<ActionsMenuProps> = ({
  menu,
  dataRef,
  setMenu,
  onDismissModal,
  setRenderModal,
  useStylesVaultScreen: { styles },
}) => {
  const { closeModalRef, openModalRef } = useModal();
  const { statesRef, functionsRef, setFilesSelected, folders } = useVault();

  const handlePressByAction = useCallback(
    (action: Action["action"], item: FolderFiles[number] | null) => {
      setMenu(defaultMenuState);

      if (!item) return;
      onDismissModal();

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
          functionsRef.current.selectFile(item);
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
      setMenu,
      statesRef,
      openModalRef,
      functionsRef,
      closeModalRef,
      onDismissModal,
      setRenderModal,
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
            onPress={() => {
              handlePressByAction(action.action, dataRef.current.menu.item);
              setMenu(defaultMenuState);
            }}
            leadingIcon={action.icon}
          />
        );
      }),
    [handlePressByAction, folders, statesRef, functionsRef, dataRef, setMenu],
  );

  if (!menu.visible) return null;

  return (
    <Menu
      visible
      onDismiss={() => setMenu(defaultMenuState)}
      anchor={{ x: menu.x, y: menu.y }}
    >
      {actionsMenu()}
    </Menu>
  );
};

export default memoDeep(ActionsMenu);
