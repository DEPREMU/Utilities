import {
  Falsy,
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
  alerts,
  tTyped,
  logger,
  REPLACERS,
  deviceInfo,
  navigation,
  encryptFile,
  getRandomUUID,
  getFoldersVault,
  renameVaultItem,
  EventsDeviceInfo,
  sanitizeFileName,
  storageManagement,
  decryptFolderFiles,
  setTimeoutPolyfill,
  actionWithVaultItem,
  clearTimeoutPolyfill,
  getDefaultVaultDirectory,
  getMimeTypeFromExtension,
  clearDecryptedFolderDirectory,
} from "@utils";
import Button from "@/common/components/Button/screens";
import { modalRef } from "@refs";
import { cloneDeep } from "lodash";
import { TextInput } from "react-native-paper";
import * as ExpoAuth from "expo-local-authentication";
import { ModalData } from "@screens/Vault/screens/VaultViewer";
import * as FileSystem from "expo-file-system";
import { windowModule } from "@modules";
import * as DocumentPicker from "expo-document-picker";

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
  sessionId: getRandomUUID(),
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

        modalRef.openModal?.(
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
                alerts.showAlert(
                  tTyped("vault.settings.minLengthPassword", {
                    min: String(DEFAULT_VAULT_DATA.MIN_LENGTH_PASSWORD),
                  }) as never,
                  "" as never,
                  async () => {},
                  { showCancelButton: false },
                );

                resolve(false);
              }

              modalRef.closeModal?.();
              modalRef.openModal?.(
                tTyped("common.confirmPassword"),
                tTyped("vault.settings.confirmPasswordMessage", {
                  folderName,
                }),
                <Button
                  label={tTyped("common.confirm")}
                  handlePress={async () => {
                    modalRef.closeModal?.();
                    const prev = storageManagement.get("VAULT_PASSWORD", {});

                    storageManagement.save("VAULT_PASSWORD", {
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

      let directory = storageManagement.get("VAULT_DIRECTORY", "");
      const password = storageManagement.get("VAULT_PASSWORD", {});
      if (!directory) {
        await new Promise<void>((resolve) => {
          const handlePressSelectFolder = async (errorInDefault?: boolean) => {
            if (errorInDefault)
              alerts.showAlert(
                "error",
                "vault.noDefaultFolder",
                async () => {},
                { showCancelButton: false },
              );
            directory = await windowModule.pickFolder();
            modalRef.closeModal?.();
            resolve();
          };

          modalRef.openModal?.(
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
                  directory = REPLACERS.isWeb
                    ? await windowModule.getSafeFolder()
                    : (await getDefaultVaultDirectory()).uri;

                  if (directory === "unknown") await handlePressSelectFolder();
                  else {
                    if (REPLACERS.isNative) {
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
                    modalRef.closeModal?.();
                  }
                }}
              />
            </>,
            () => {
              callback?.(false);
            },
          );
        });

        if (REPLACERS.isWeb) {
          if (directory === "unknown" || directory === "canceled") {
            directory = await windowModule.pickFolder();
            if (directory === "canceled") {
              callback?.(false);
              return;
            }
          }
        }
        storageManagement.save("VAULT_DIRECTORY", directory);
      }
      if (Object.keys(password).length === 0) {
        const success = await functionsRef.current.selectPassword();
        if (!success) {
          const onPressDismiss = () => {
            modalRef.closeModal?.();
            navigation.replace("Home");
          };

          modalRef.openModal?.(
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
        if (REPLACERS.isWeb) {
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
          storageManagement.get("VAULT_PASSWORD", {
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
        logger.error("Error during authentication:", (error as Error).message);
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

        if (REPLACERS.isWeb) windowModule.clearDecryptedFolderDirectory();
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

                if ((!size || !mimeType) && REPLACERS.isNative) {
                  const fileRead = new FileSystem.File(file.uri);
                  const fileInfo = fileRead.info();
                  if (!size) {
                    size = fileInfo.size || 0;
                  }
                  if (!mimeType) {
                    mimeType = getMimeTypeFromExtension(fileRead.extension);
                  }
                }
                if (REPLACERS.isWeb) {
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
                logger.error("Error picking file:", (error as Error).message);
                return null;
              }
            }),
          )
        ).filter((f): f is PickedFile => Boolean(f));

        setFiles((prevFiles) => [...prevFiles, ...files]);

        return files;
      } catch (error) {
        logger.error("Error picking files:", (error as Error).message);
        return "canceled";
      }
    },

    removeFile: (fileToRemove) => {
      setFiles((prevFiles) =>
        prevFiles.filter((file) => file.uri !== fileToRemove.uri),
      );
      if (REPLACERS.isWeb) {
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

      const passwords = storageManagement.get(
        "VAULT_PASSWORD",
        {} as Record<string, string>,
      );
      const password = passwords[folderId];
      if (!password) {
        functionsRef.current.selectPassword();
        return;
      }

      const files = statesRef.current.files;

      if (REPLACERS.isWeb) {
        const { success, errFiles } = await windowModule.encryptFiles(
          files,
          password,
          folderId,
        );

        if (errFiles && errFiles.length > 0) {
          modalRef.openModal?.(
            tTyped("error"),
            tTyped("vault.encryptFilesErrorMessage", {
              count: String(errFiles.length),
              filenames: errFiles.map((f) => f.name).join(", "),
            }),
            <Button
              label={tTyped("labels.continue")}
              handlePress={() => modalRef.closeModal?.()}
            />,
          );
        }

        if (success) {
          setFiles([]);
          functionsRef.current.unlockFolder();
        } else {
          alerts.showAlert(
            "error",
            tTyped("vault.encryptFilesErrorMessage", {
              filenames: files.map((f) => f.name).join(", "),
              count: String(files.length),
            }) as never,
            async () => {},
          );
        }
      } else {
        const directory = storageManagement.get("VAULT_DIRECTORY", "");

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
              logger.error(
                "ENCRYPT",
                "Error encrypting file:",
                (error as Error).message,
              );
            }
          }),
        );
        if (successes > 0) {
          alerts.showAlert(
            "vault.encryptFilesSuccessTitle",
            tTyped("vault.encryptFilesSuccessMessage", {
              count: String(successes),
            }) as never,
            async () => {},
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
        const passwords = storageManagement.get("VAULT_PASSWORD");
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

          modalRef.openModal?.(
            tTyped("vault.unlock"),
            <TextInput
              secureTextEntry
              placeholder={tTyped("auth.passwordPlaceholder")}
              onChangeText={(t) => (pass = t)}
              defaultValue=""
            />,
            <Button
              label={tTyped("common.confirm")}
              handlePress={() => {
                if (verifying) return;
                verifying = true;

                const passwords = storageManagement.get(
                  "VAULT_PASSWORD",
                  {} as Record<string, string>,
                );
                const correctPassword = passwords[folderId];

                if (pass !== correctPassword) {
                  alerts.showAlert(
                    "error",
                    "auth.incorrectPassword",
                    async () => {},
                    { showCancelButton: false },
                  );
                  resolve("");
                } else {
                  success = true;
                  resolve(pass);
                }
                modalRef.closeModal?.();
              }}
            />,
            () => resolve(verifying && success ? pass : ""),
          );
        });

      if (!password) return;

      if (REPLACERS.isWeb) {
        const files = await windowModule.loadEncryptedFiles(folderId, password);
        setFolders((prevFolders) => ({
          ...prevFolders,
          [folderId]: files,
        }));
      } else {
        const directory = storageManagement.get("VAULT_DIRECTORY", "");
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

      if (REPLACERS.isWeb)
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

      if (REPLACERS.isWeb) {
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

      if (REPLACERS.isWeb) {
        windowModule.renameFolderVault(folderId, newName);
      } else {
        const directory = storageManagement.get("VAULT_DIRECTORY", "");
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

      if (REPLACERS.isWeb) {
        windowModule.deleteFolderVault(folderId);
      } else {
        const directory = storageManagement.get("VAULT_DIRECTORY", "");
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
    const removeListenerAppState = deviceInfo.addEventListener(
      EventsDeviceInfo.appStateChange,
      (newState) => {
        if (newState !== "active") functionsRef.current.lock();
      },
    );

    const removeListenerScreen = deviceInfo.addEventListener(
      EventsDeviceInfo.screenChange,
      (screenName) => {
        if (screenName !== "Vault") functionsRef.current.lock();
      },
    );

    const loadVaultSettings = async () => {
      const loadedSettings = storageManagement.get("VAULT_SETTINGS");
      if (loadedSettings) setSettings(loadedSettings);
      else storageManagement.save("VAULT_SETTINGS", getDefaultSettings());
      const passwords = storageManagement.get("VAULT_PASSWORD", {});

      let folderNames = Object.keys(passwords);
      if (!folderNames.length) {
        if (REPLACERS.isWeb) {
          folderNames = await windowModule.getExistingVaultFolders();
        } else {
          folderNames = await getFoldersVault();
        }
      }
      if (!folderNames.length)
        folderNames = [DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME];

      setFolders(
        folderNames.reduce(
          (acc, folder) => {
            acc[folder] = "locked";
            return acc;
          },
          {} as VaultContextProps["folders"],
        ),
      );
    };

    const removePreviousSession = async () => {
      setData(initializeVault(false));
      if (REPLACERS.isWeb) windowModule.clearDecryptedFolderDirectory();
      else clearDecryptedFolderDirectory();
    };

    loadVaultSettings();
    removePreviousSession();
    return () => {
      removeListenerScreen();
      removeListenerAppState();

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
