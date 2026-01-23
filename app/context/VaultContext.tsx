import {
  PickedFile,
  FolderFiles,
  VaultSettings,
  DownloadableMimeType,
} from "@types";
import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useContext,
  createContext,
} from "react";
import {
  tTyped,
  logError,
  showAlert,
  getRandomId,
  encryptFile,
  loadDataStorage,
  saveDataStorage,
  renameVaultItem,
  sanitizeFileName,
  functionsToExecute,
  decryptFolderFiles,
  setTimeoutPolyfill,
  actionWithVaultItem,
  clearTimeoutPolyfill,
  getMimeTypeFromExtension,
  clearDecryptedFolderDirectory,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import { Falsy, Platform } from "react-native";
import { useModal } from "./ModalContext";
import windowModule from "@/utils/modules/WindowModule";
import { TextInput } from "react-native-paper";
import * as ExpoAuth from "expo-local-authentication";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { navigateReplace } from "@/navigation/navigationRef";
import { ModalData } from "@/screens/Vault/VaultViewer";
import { cloneDeep } from "lodash";

type VaultData = {
  sessionId: string;
  isUnlocked: boolean;
  initializedAt: string;
};

type VaultFunctions = {
  lock: (callback?: () => void) => void;
  unlock: (callback?: (success: boolean) => void) => Promise<void>;
  pickFiles: () => Promise<PickedFile[] | "canceled">;
  removeFile: (fileToRemove: PickedFile) => void;
  deleteFile: (file: FolderFiles[number]) => void;
  renameFile: (item: FolderFiles[number], newName: string) => void;
  unlockFolder: () => void;
  encryptFiles: () => Promise<void>;
  selectPassword: () => Promise<boolean>;
  actionWithFile: (
    action: "copy" | "move",
    item: FolderFiles[number],
    folderId: string,
  ) => void;
  getCurrentFolderId: () => string;
  getTypeModalData: (
    mimeType: DownloadableMimeType | Falsy,
  ) => ModalData["type"];
  selectFile: (item: FolderFiles[number]) => Promise<void>;
  renameFolder: (folderId: string, newName: string) => Promise<void>;
  deleteFolder: (folderId: string) => void;
};

export type FilesSelected = {
  files: { [folder: string]: { [fileUri: string]: boolean } };
  selecting: boolean;
  lastIndex: number | null;
};

export type StatesObj = {
  data: VaultData | null;
  files: PickedFile[];
  folders: Record<string, FolderFiles | "locked">;
  settings: VaultSettings;
  filesSelected: FilesSelected;
  currentFolderId: string;
};

type VaultContextProps = {
  data: StatesObj["data"];
  files: StatesObj["files"];
  folders: StatesObj["folders"];
  functionsRef: React.RefObject<VaultFunctions>;
  statesRef: React.RefObject<StatesObj>;
  currentFolderId: StatesObj["currentFolderId"];
  setCurrentFolderId: React.Dispatch<
    React.SetStateAction<StatesObj["currentFolderId"]>
  >;
  settings: StatesObj["settings"];
  setSettings: React.Dispatch<React.SetStateAction<StatesObj["settings"]>>;
  filesSelected: StatesObj["filesSelected"];
  filesUploading: Record<string, number>;
  setFilesSelected: React.Dispatch<
    React.SetStateAction<StatesObj["filesSelected"]>
  >;
};

const defaultFilesSelected: FilesSelected = {
  files: {},
  selecting: false,
  lastIndex: null,
};

const getDefaultSettings = (): VaultSettings => ({
  autoLockSeconds: 60,
});

const initializeVault = (isUnlocked?: boolean): VaultData => ({
  sessionId: getRandomId(),
  isUnlocked: !!isUnlocked,
  initializedAt: new Date().toISOString(),
});

export const DEFAULT_VAULT_DATA = {
  MIN_LENGTH_PASSWORD: 32,
  DEFAULT_FOLDER_NAME: "Default",
};

const VaultContext = createContext<VaultContextProps | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { openModalRef, closeModalRef } = useModal();

  const [files, setFiles] = useState<VaultContextProps["files"]>([]);
  const [folders, setFolders] = useState<VaultContextProps["folders"]>({});
  const [settings, setSettings] =
    useState<VaultContextProps["settings"]>(getDefaultSettings());
  const [filesUploading, setFilesUploading] = useState<
    VaultContextProps["filesUploading"]
  >({});

  const [data, setData] = useState<VaultContextProps["data"]>(null);
  const [currentFolderId, setCurrentFolderId] =
    useState<VaultContextProps["currentFolderId"]>("");
  const [filesSelected, setFilesSelected] =
    useState<FilesSelected>(defaultFilesSelected);

  const idTimeoutRef = useRef<number | null>(null);

  const statesRef = useRef<StatesObj>({
    data,
    files,
    folders,
    settings,
    filesSelected,
    currentFolderId,
  });
  statesRef.current = {
    data,
    files,
    folders,
    settings,
    filesSelected,
    currentFolderId,
  };

  const functionsRef = useRef<VaultFunctions>({
    getCurrentFolderId: () => {
      return (
        statesRef.current.currentFolderId ||
        DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME
      );
    },

    selectPassword: () =>
      new Promise<boolean>((resolve) => {
        let pass = "";
        const folderName = functionsRef.current.getCurrentFolderId();

        openModalRef.current(
          tTyped("vault.settings.setAuthPasswordMessage", {
            folderName,
          }),
          <>
            <TextInput
              secureTextEntry
              placeholder={tTyped("auth.passwordPlaceholder")}
              onChangeText={(t) => (pass = t)}
            />
          </>,
          <Button
            label={tTyped("common.confirm")}
            handlePress={() => {
              if (
                !pass ||
                pass.length < DEFAULT_VAULT_DATA.MIN_LENGTH_PASSWORD
              ) {
                showAlert(
                  tTyped("vault.settings.minLengthPassword", {
                    min: String(DEFAULT_VAULT_DATA.MIN_LENGTH_PASSWORD),
                  }),
                  undefined,
                  [{ text: tTyped("common.confirm") }],
                );

                resolve(false);
              }

              closeModalRef.current();
              openModalRef.current(
                tTyped("common.confirmPassword"),
                tTyped("vault.settings.confirmPasswordMessage", {
                  folderName,
                }),
                <Button
                  label={tTyped("common.confirm")}
                  handlePress={async () => {
                    closeModalRef.current();
                    const prev = await loadDataStorage("VAULT_PASSWORD", {});

                    saveDataStorage("VAULT_PASSWORD", {
                      ...prev,
                      [folderName]: pass,
                    });
                    resolve(true);
                  }}
                />,
              );
            }}
          />,
        );
      }),

    unlock: async (callback) => {
      if (statesRef.current.data?.isUnlocked) {
        callback?.(true);
        clearTimeoutPolyfill(idTimeoutRef);
        return;
      }

      let directory = await loadDataStorage("VAULT_DIRECTORY", "");
      const password = await loadDataStorage("VAULT_PASSWORD", {});
      if (!directory) {
        await new Promise<void>((resolve) => {
          const handlePressSelectFolder = async (errorInDefault?: boolean) => {
            if (errorInDefault)
              showAlert(tTyped("error"), tTyped("vault.noDefaultFolder"));
            directory = await windowModule.pickFolder();
            closeModalRef.current();
            resolve();
          };

          openModalRef.current(
            tTyped("common.selectFolder"),
            tTyped("vault.selectFolderMessage"),
            <>
              <Button
                label={tTyped("common.selectFolder")}
                handlePress={handlePressSelectFolder}
              />
              <Button
                label={tTyped("vault.useDefaultFolder")}
                handlePress={async () => {
                  directory =
                    Platform.OS === "web"
                      ? await windowModule.getSafeFolder()
                      : new FileSystem.Directory(
                          FileSystem.Paths.document.uri,
                          ".vault",
                        ).uri;

                  if (directory === "unknown") await handlePressSelectFolder();
                  else {
                    if (Platform.OS !== "web") {
                      try {
                        new FileSystem.Directory(directory).create({
                          idempotent: true,
                          intermediates: true,
                        });
                      } catch {
                        // ignore error
                      }
                    }
                    resolve();
                    closeModalRef.current();
                  }
                }}
              />
            </>,
            () => {
              callback?.(false);
            },
          );
        });

        if (Platform.OS === "web") {
          if (directory === "unknown" || directory === "canceled") {
            directory = await windowModule.pickFolder();
            if (directory === "canceled") {
              callback?.(false);
              return;
            }
          }
        }
        await saveDataStorage("VAULT_DIRECTORY", directory);
      }
      if (Object.keys(password).length === 0) {
        const success = await functionsRef.current.selectPassword();
        if (!success) {
          const onPressDismiss = () => {
            closeModalRef.current();
            navigateReplace("Home");
          };

          openModalRef.current(
            tTyped("error"),
            tTyped("vault.noPasswordAssigned", {
              folderName:
                statesRef.current.currentFolderId ||
                DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME,
            }),
            <Button
              label={tTyped("common.back")}
              handlePress={onPressDismiss}
            />,
            onPressDismiss,
          );
          callback?.(false);
          return;
        }
      }

      try {
        if (Platform.OS === "web") {
          const res = await windowModule.authenticate();
          if (!res) {
            callback?.(false);
            return;
          }
        } else {
          const res = await ExpoAuth.authenticateAsync({
            cancelLabel: tTyped("labels.cancel"),
            promptMessage: tTyped("auth.authenticate"),
            promptDescription: tTyped("auth.authenticateMessage"),
          });

          if (!res.success) {
            callback?.(false);
            return;
          }
        }

        const folders = Object.keys(
          await loadDataStorage("VAULT_PASSWORD", {
            [DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME]: "",
          }),
        );
        setCurrentFolderId(
          folders[0] || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME,
        );
        setFolders(
          folders.reduce(
            (acc, folder) => {
              acc[folder] = "locked";
              return acc;
            },
            {} as VaultContextProps["folders"],
          ),
        );

        setData(initializeVault(true));
        callback?.(true);
      } catch (error) {
        logError("Error during authentication:", (error as Error).message);
        callback?.(false);
      }
    },

    lock: (callback) => {
      if (!statesRef.current.data?.isUnlocked) return;

      clearTimeoutPolyfill(idTimeoutRef);
      idTimeoutRef.current = setTimeoutPolyfill(async () => {
        setData(null);
        setFiles([]);
        setFolders({});
        setFilesSelected(defaultFilesSelected);
        callback?.();

        if (Platform.OS === "web") windowModule.clearDecryptedFolderDirectory();
        else clearDecryptedFolderDirectory();
      }, statesRef.current.settings.autoLockSeconds * 1000);
    },

    pickFiles: async () => {
      try {
        const pickedFiles = await DocumentPicker.getDocumentAsync({
          type: "*/*",
          multiple: true,
        });

        if (pickedFiles.canceled) return "canceled";

        const files = (
          await Promise.all(
            pickedFiles.assets.map(async (file) => {
              try {
                let uri = file.uri;
                const name = file.name;
                let size = file.size || 0;
                let mimeType = file.mimeType as DownloadableMimeType | null;

                if ((!size || !mimeType) && Platform.OS !== "web") {
                  const fileRead = new FileSystem.File(file.uri);
                  const fileInfo = fileRead.info();
                  if (!size) {
                    size = fileInfo.size || 0;
                  }
                  if (!mimeType) {
                    mimeType = getMimeTypeFromExtension(fileRead.extension);
                  }
                }
                if (Platform.OS === "web") {
                  const { info } = await windowModule.copyFileToTemp(
                    file.base64 || "",
                    file.name,
                  );

                  if (!info) return null;

                  size = info?.size || size || 0;
                  uri = info?.uri || uri;
                  mimeType = mimeType || info?.mimeType || null;
                }

                const pickedFile: PickedFile = {
                  uri,
                  name,
                  size,
                  mimeType,
                };

                return pickedFile;
              } catch (error) {
                logError("Error picking file:", (error as Error).message);
                return null;
              }
            }),
          )
        ).filter((f): f is PickedFile => Boolean(f));

        setFiles((prevFiles) => [...prevFiles, ...files]);

        return files;
      } catch (error) {
        logError("Error picking files:", (error as Error).message);
        return "canceled";
      }
    },

    removeFile: (fileToRemove) => {
      setFiles((prevFiles) =>
        prevFiles.filter((file) => file.uri !== fileToRemove.uri),
      );
      if (Platform.OS === "web") {
        windowModule.removeFile(fileToRemove.uri);
      } else {
        try {
          new FileSystem.File(fileToRemove.uri).delete();
        } catch {
          // ignore error
        }
      }
    },

    encryptFiles: async () => {
      const folderId =
        statesRef.current.currentFolderId ||
        DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

      const passwords = await loadDataStorage(
        "VAULT_PASSWORD",
        {} as Record<string, string>,
      );
      const password = passwords[folderId];
      if (!password) {
        functionsRef.current.selectPassword();
        return;
      }

      const files = statesRef.current.files;

      if (Platform.OS === "web") {
        const { success, errFiles } = await windowModule.encryptFiles(
          files,
          password,
          folderId,
        );

        if (errFiles && errFiles.length > 0) {
          openModalRef.current(
            tTyped("error"),
            tTyped("vault.encryptFilesErrorMessage", {
              count: String(errFiles.length),
              filenames: errFiles.map((f) => f.name).join(", "),
            }),
            <Button
              label={tTyped("labels.continue")}
              handlePress={closeModalRef.current}
            />,
          );
        }

        if (success) {
          setFiles([]);
          functionsRef.current.unlockFolder();
        } else {
          showAlert(tTyped("error"));
        }
      } else {
        const directory = await loadDataStorage("VAULT_DIRECTORY", "");

        let successes = 0;
        const outputDir = new FileSystem.Directory(directory, folderId);
        try {
          if (!outputDir.exists)
            outputDir.create({ idempotent: true, intermediates: true });
        } catch {
          // ignore error
        }
        await Promise.all(
          files.map(async (file) => {
            try {
              const outpath = new FileSystem.File(
                outputDir,
                sanitizeFileName(file.name + ".enc"),
              ).uri;

              const result = await encryptFile(
                file.uri,
                outpath,
                password,
                (progress) => {
                  setFilesUploading((prev) => ({
                    ...prev,
                    [file.uri]: progress,
                  }));
                },
              );
              setFilesUploading((prev) => {
                const updated = { ...prev };
                delete updated[file.uri];
                return updated;
              });
              if (!result) return;

              successes++;
              setFiles((prevFiles) =>
                prevFiles.filter((f) => f.uri !== file.uri),
              );
            } catch (error) {
              logError(
                "ENCRYPT",
                "Error encrypting file:",
                (error as Error).message,
              );
            }
          }),
        );
        if (successes > 0) {
          showAlert(
            tTyped("vault.encryptFilesSuccessTitle"),
            tTyped("vault.encryptFilesSuccessMessage", {
              count: String(successes),
            }),
          );
          functionsRef.current.unlockFolder();
        }
      }
    },

    unlockFolder: async () => {
      const folderId =
        statesRef.current.currentFolderId ||
        DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

      const isLocked = statesRef.current.folders[folderId] === "locked";

      let password = "";

      if (!isLocked) {
        const passwords = await loadDataStorage("VAULT_PASSWORD");
        if (passwords) {
          const correctPassword = passwords[folderId];
          password = correctPassword || "";
        }
      }

      if (!password)
        password = await new Promise<string>((resolve) => {
          let pass = "";
          let success = false;
          let verifying = false;

          openModalRef.current(
            tTyped("vault.unlock"),
            <TextInput
              secureTextEntry
              placeholder={tTyped("auth.passwordPlaceholder")}
              onChangeText={(t) => (pass = t)}
              defaultValue=""
            />,
            <Button
              label={tTyped("common.confirm")}
              handlePress={async () => {
                if (verifying) return;
                verifying = true;

                const passwords = await loadDataStorage(
                  "VAULT_PASSWORD",
                  {} as Record<string, string>,
                );
                const correctPassword = passwords[folderId];

                if (pass !== correctPassword) {
                  showAlert(tTyped("error"), tTyped("auth.incorrectPassword"), [
                    { text: tTyped("common.confirm") },
                  ]);
                  resolve("");
                } else {
                  success = true;
                  resolve(pass);
                }
                closeModalRef.current();
              }}
            />,
            () => resolve(verifying && success ? pass : ""),
          );
        });

      if (!password) return;

      if (Platform.OS === "web") {
        const files = await windowModule.loadEncryptedFiles(folderId, password);
        setFolders((prevFolders) => ({
          ...prevFolders,
          [folderId]: files,
        }));
      } else {
        const directory = await loadDataStorage("VAULT_DIRECTORY", "");
        const folderPath = new FileSystem.Directory(directory, folderId);
        const files = await decryptFolderFiles(
          folderPath.uri,
          password,
          (file) => {
            setFolders((prevFolders) => {
              const existingFiles = prevFolders[folderId];
              const existFile = Array.isArray(existingFiles)
                ? existingFiles.find((f) => f.originalUri === file.originalUri)
                : null;
              if (existFile) return prevFolders;

              return {
                ...prevFolders,
                [folderId]: [
                  ...(Array.isArray(existingFiles) ? existingFiles : []),
                  file,
                ],
              };
            });
          },
        );
        setFolders((prevFolders) => ({
          ...prevFolders,
          [folderId]: files,
        }));
      }
    },

    deleteFile: (file) => {
      const folderId =
        statesRef.current.currentFolderId ||
        DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

      const folderFiles = statesRef.current.folders[folderId];
      if (!folderFiles || folderFiles === "locked") return;

      setFolders((prevFolders) => ({
        ...prevFolders,
        [folderId]: folderFiles.filter((f) => f.uri !== file.uri),
      }));

      [file.uri, file.originalUri].forEach((uri) => {
        try {
          new FileSystem.File(uri).delete();
        } catch {
          // ignore error
        }
      });
    },

    actionWithFile: (action, item, folderId) => {
      const currentFolderId =
        statesRef.current.currentFolderId ||
        DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

      setFolders((prevFolders) => ({
        ...prevFolders,
        ...(action === "copy"
          ? {}
          : {
              [currentFolderId]:
                prevFolders[currentFolderId] === "locked"
                  ? "locked"
                  : prevFolders[currentFolderId].filter(
                      (f) => f.uri !== item.uri,
                    ),
            }),
        [folderId]:
          prevFolders[folderId] === "locked"
            ? "locked"
            : [...prevFolders[folderId], item],
      }));

      if (Platform.OS === "web")
        windowModule.actionWithVaultItem(action, item, folderId);
      else actionWithVaultItem(action, item, folderId);
    },

    renameFile: (file, newName) => {
      const folderId =
        statesRef.current.currentFolderId ||
        DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

      const folderFiles = statesRef.current.folders[folderId];
      if (!folderFiles || folderFiles === "locked") return;

      setFolders((prevFolders) => ({
        ...prevFolders,
        [folderId]: folderFiles.map((f) =>
          f.uri === file.uri ? { ...f, name: newName } : f,
        ),
      }));

      if (Platform.OS === "web") {
        windowModule.renameVaultItem(file, newName);
      } else {
        renameVaultItem(file, newName);
      }
    },

    getTypeModalData: (
      mimeType: DownloadableMimeType | Falsy,
    ): ModalData["type"] => {
      if (!mimeType) return "none";
      if (mimeType.startsWith("image/")) return "image";
      if (mimeType.startsWith("video/")) return "video";
      if (mimeType.startsWith("text/")) return "text";
      if (mimeType === "application/pdf") return "pdf";

      return "none";
    },

    selectFile: async (item) => {
      const currentFolderId = functionsRef.current?.getCurrentFolderId();
      const isSelected =
        !!statesRef.current.filesSelected.files[currentFolderId]?.[item.uri];

      if (isSelected)
        setFilesSelected((prev) => {
          const updated = cloneDeep(prev);
          delete updated.files[currentFolderId][item.uri];
          if (!Object.keys(updated.files[currentFolderId]).length)
            delete updated.files[currentFolderId];

          if (!Object.keys(updated.files).length) updated.selecting = false;

          return updated;
        });
      else
        setFilesSelected((prev) => {
          if (statesRef.current.folders[currentFolderId] === "locked")
            return prev;

          const updated = cloneDeep(prev);
          if (!updated.files[currentFolderId])
            updated.files[currentFolderId] = {};
          updated.selecting = true;
          updated.lastIndex =
            statesRef.current.folders[currentFolderId].indexOf(item) ?? null;
          updated.files[currentFolderId][item.uri] = true;
          return updated;
        });
    },

    renameFolder: async (folderId, newName) => {
      setFolders((prevFolders) => {
        const updatedFolders = cloneDeep(prevFolders);
        updatedFolders[newName] = cloneDeep(updatedFolders[folderId]);
        delete updatedFolders[folderId];
        return updatedFolders;
      });

      if (Platform.OS === "web") {
        windowModule.renameFolderVault(folderId, newName);
      } else {
        const directory = await loadDataStorage("VAULT_DIRECTORY", "");
        const oldFolderPath = new FileSystem.Directory(directory, folderId);
        try {
          oldFolderPath.rename(newName);
        } catch {
          // ignore error
        }
      }
    },

    deleteFolder: async (folderId) => {
      setFolders((prevFolders) => {
        const updatedFolders = cloneDeep(prevFolders);
        delete updatedFolders[folderId];
        return updatedFolders;
      });

      if (Platform.OS === "web") {
        windowModule.deleteFolderVault(folderId);
      } else {
        const directory = await loadDataStorage("VAULT_DIRECTORY", "");
        const folderPath = new FileSystem.Directory(directory, folderId);
        try {
          folderPath.delete();
        } catch {
          // ignore error
        }
      }
    },
  });

  useEffect(() => {
    functionsToExecute.current["AppState-change"]["VaultContext"] = (
      newState,
    ) => {
      if (newState !== "active") functionsRef.current.lock();
    };
    functionsToExecute.current["Screen-change"]["VaultContext"] = (
      screenName,
    ) => {
      if (screenName !== "Vault") functionsRef.current.lock();
    };

    loadDataStorage("VAULT_SETTINGS").then((loadedSettings) => {
      if (loadedSettings) setSettings(loadedSettings);
      else saveDataStorage("VAULT_SETTINGS", getDefaultSettings());
    });
    loadDataStorage("VAULT_PASSWORD", {}).then((passwords) => {
      const folderNames = Object.keys(passwords);
      if (!folderNames.length) return;

      setFolders(
        folderNames.reduce(
          (acc, folder) => {
            acc[folder] = "locked";
            return acc;
          },
          {} as VaultContextProps["folders"],
        ),
      );
    });

    const removePreviousSession = async () => {
      setData(initializeVault(false));
      if (Platform.OS === "web") windowModule.clearDecryptedFolderDirectory();
      else clearDecryptedFolderDirectory();
    };

    removePreviousSession();
    return () => {
      delete functionsToExecute.current["AppState-change"]["VaultContext"];
      delete functionsToExecute.current["Screen-change"]["VaultContext"];

      clearTimeoutPolyfill(idTimeoutRef);
    };
  }, []);

  const value: VaultContextProps = useMemo(
    () => ({
      data,
      files,
      folders,
      settings,
      statesRef,
      setSettings,
      functionsRef,
      filesSelected,
      filesUploading,
      currentFolderId,
      setFilesSelected,
      setCurrentFolderId,
    }),
    [
      data,
      files,
      folders,
      settings,
      filesSelected,
      filesUploading,
      currentFolderId,
    ],
  );

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  );
};

export const useVault = (): VaultContextProps => {
  const context = useContext(VaultContext);

  if (!context) throw new Error("useVault must be used within a VaultProvider");

  return context;
};
