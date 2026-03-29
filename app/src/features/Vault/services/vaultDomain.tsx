import React from "react";
import {
  Falsy,
  PickedFile,
  FolderFiles,
  VaultSettings,
  DownloadableMimeType,
} from "@types";
import {
  alerts,
  tTyped,
  logger,
  EXTENSION_ENCRYPTED,
  REPLACERS,
  navigation,
  encryptFile,
  getRandomUUID,
  getFoldersVault,
  renameVaultItem,
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
import { cloneDeep } from "lodash";
import { modalRef } from "@refs";
import * as ExpoAuth from "expo-local-authentication";
import { ModalData } from "@screens/Vault/screens/VaultViewer";
import * as FileSystem from "expo-file-system";
import { windowModule } from "@modules";
import * as DocumentPicker from "expo-document-picker";
import Button from "@/common/components/Button/screens";
import { TextInput } from "react-native-paper";
import { vaultServiceManager } from "@/features/Vault/services/vault";

export type VaultData = {
  sessionId: string;
  isUnlocked: boolean;
  initializedAt: string;
};

export type FilesSelected = {
  files: { [folder: string]: { [fileUri: string]: boolean } };
  selecting: boolean;
  lastIndex: number | null;
};

export type VaultFunctions = {
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

export type VaultDomainState = {
  data: VaultData | null;
  files: PickedFile[];
  folders: Record<string, FolderFiles | "locked">;
  settings: VaultSettings;
  filesSelected: FilesSelected;
  currentFolderId: string;
  filesUploading: Record<string, number>;
};

const defaultFilesSelected: FilesSelected = {
  files: {},
  selecting: false,
  lastIndex: null,
};

const getFileSelectionKey = (item: FolderFiles[number]) => {
  return item.originalUri || item.uri;
};

const getEncryptedUriByName = (
  originalUri: string,
  newName: string,
): string => {
  const idx = originalUri.lastIndexOf("/");
  if (idx === -1) return originalUri;
  const basePath = originalUri.slice(0, idx + 1);
  return `${basePath}${sanitizeFileName(newName + EXTENSION_ENCRYPTED)}`;
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

type VaultStateListener = (state: VaultDomainState) => void;

type StateUpdater<T> = T | ((previous: T) => T);

class VaultDomainService {
  #state: VaultDomainState = {
    data: null,
    files: [],
    folders: {},
    settings: getDefaultSettings(),
    filesSelected: defaultFilesSelected,
    currentFolderId: "",
    filesUploading: {},
  };

  #dbService = vaultServiceManager.getService();
  #listeners = new Set<VaultStateListener>();
  #idTimeoutRef: number | null = null;

  #initialized = false;
  #initPromise: Promise<void> | null = null;

  #emitState = () => {
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  };

  #setState = (updater: (previous: VaultDomainState) => VaultDomainState) => {
    this.#state = updater(this.#state);
    this.#emitState();
  };

  #setSlice = <K extends keyof VaultDomainState>(
    key: K,
    value: StateUpdater<VaultDomainState[K]>,
  ) => {
    this.#setState((previous) => ({
      ...previous,
      [key]:
        typeof value === "function"
          ? (value as (prev: VaultDomainState[K]) => VaultDomainState[K])(
              previous[key],
            )
          : value,
    }));
  };

  public subscribe = (listener: VaultStateListener) => {
    this.#listeners.add(listener);
    listener(this.#state);

    return () => {
      this.#listeners.delete(listener);
    };
  };

  public getState = () => this.#state;

  public setCurrentFolderId = (
    value: StateUpdater<VaultDomainState["currentFolderId"]>,
  ) => {
    this.#setSlice("currentFolderId", value);
  };

  public setSettings = (value: StateUpdater<VaultDomainState["settings"]>) => {
    const nextSettings =
      typeof value === "function"
        ? (value as (prev: VaultSettings) => VaultSettings)(
            this.#state.settings,
          )
        : value;

    storageManagement.save("VAULT_SETTINGS", nextSettings);
    this.#setSlice("settings", nextSettings);
  };

  public setFilesSelected = (
    value: StateUpdater<VaultDomainState["filesSelected"]>,
  ) => {
    this.#setSlice("filesSelected", value);
  };

  public initialize = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;

    const init = async () => {
      try {
        await this.#dbService.waitUntilLoaded();

        const loadedSettings = storageManagement.get("VAULT_SETTINGS");
        if (loadedSettings) {
          this.#setSlice("settings", loadedSettings);
        } else {
          storageManagement.save("VAULT_SETTINGS", getDefaultSettings());
        }

        const passwords = storageManagement.get("VAULT_PASSWORD", {});
        let folderNames = Object.keys(passwords);
        if (!folderNames.length) {
          if (REPLACERS.isWeb) {
            folderNames = await windowModule.getExistingVaultFolders();
          } else {
            folderNames = await getFoldersVault();
          }
        }
        if (!folderNames.length) {
          folderNames = [DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME];
        }

        this.#setState((previous) => ({
          ...previous,
          folders: folderNames.reduce(
            (acc, folder) => {
              acc[folder] = "locked";
              return acc;
            },
            {} as VaultDomainState["folders"],
          ),
        }));

        this.#setSlice("data", initializeVault(false));
        if (REPLACERS.isWeb) {
          windowModule.clearDecryptedFolderDirectory();
        } else {
          clearDecryptedFolderDirectory();
        }
      } finally {
        this.#initialized = true;
        this.#initPromise = null;
      }
    };

    this.#initPromise = init();

    return this.#initPromise;
  };

  public cleanUp = () => {
    clearTimeoutPolyfill(this.#idTimeoutRef);
    this.#listeners.clear();
  };

  #functions: VaultFunctions = {
    getCurrentFolderId: () => {
      return (
        this.#state.currentFolderId || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME
      );
    },

    selectPassword: () =>
      new Promise<boolean>((resolve) => {
        let pass = "";
        const folderName =
          this.#state.currentFolderId || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

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
                return;
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
      if (this.#state.data?.isUnlocked) {
        callback?.(true);
        clearTimeoutPolyfill(this.#idTimeoutRef);
        return;
      }

      let directory = storageManagement.get("VAULT_DIRECTORY", "");
      if (!directory && REPLACERS.isNative) {
        directory = (await getDefaultVaultDirectory()).uri;
      }

      const password = storageManagement.get("VAULT_PASSWORD", {});
      if (!directory && REPLACERS.isWeb) {
        await new Promise<void>((resolve) => {
          const handlePressSelectFolder = async (errorInDefault?: boolean) => {
            if (errorInDefault) {
              alerts.showAlert(
                "error",
                "vault.noDefaultFolder",
                async () => {},
                { showCancelButton: false },
              );
            }
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

                  if (directory === "unknown") {
                    await handlePressSelectFolder();
                  } else {
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

        if (directory === "unknown" || directory === "canceled") {
          directory = await windowModule.pickFolder();
          if (directory === "canceled") {
            callback?.(false);
            return;
          }
        }
        storageManagement.save("VAULT_DIRECTORY", directory);
      }

      if (Object.keys(password).length === 0) {
        const success = await this.#functions.selectPassword();
        if (!success) {
          const onPressDismiss = () => {
            modalRef.closeModal?.();
            navigation.replace("Home");
          };

          modalRef.openModal?.(
            tTyped("error"),
            tTyped("vault.noPasswordAssigned", {
              folderName:
                this.#state.currentFolderId ||
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
        } else if (!REPLACERS.isDev) {
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

        this.#setState((previous) => ({
          ...previous,
          currentFolderId: folders[0] || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME,
          folders: folders.reduce(
            (acc, folder) => {
              acc[folder] = "locked";
              return acc;
            },
            {} as VaultDomainState["folders"],
          ),
          data: initializeVault(true),
        }));

        callback?.(true);
      } catch (error) {
        logger.error("Error during authentication:", (error as Error).message);
        callback?.(false);
      }
    },

    lock: (callback) => {
      if (!this.#state.data?.isUnlocked) return;

      clearTimeoutPolyfill(this.#idTimeoutRef);
      this.#idTimeoutRef = setTimeoutPolyfill(async () => {
        this.#setState((previous) => ({
          ...previous,
          data: null,
          files: [],
          folders: {},
          filesSelected: defaultFilesSelected,
          filesUploading: {},
        }));
        callback?.();

        if (REPLACERS.isWeb) {
          windowModule.clearDecryptedFolderDirectory();
        } else {
          clearDecryptedFolderDirectory();
        }
      }, this.#state.settings.autoLockSeconds * 1000);
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

        this.#setSlice("files", (previous) => [...previous, ...files]);

        return files;
      } catch (error) {
        logger.error("Error picking files:", (error as Error).message);
        return "canceled";
      }
    },

    removeFile: (fileToRemove) => {
      this.#setSlice("files", (previous) =>
        previous.filter((file) => file.uri !== fileToRemove.uri),
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
        this.#state.currentFolderId || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

      const passwords = storageManagement.get(
        "VAULT_PASSWORD",
        {} as Record<string, string>,
      );
      const password = passwords[folderId];
      if (!password) {
        this.#functions.selectPassword();
        return;
      }

      const files = this.#state.files;

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
          this.#setSlice("files", []);
          this.#functions.unlockFolder();
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
          if (!outputDir.exists) {
            outputDir.create({ idempotent: true, intermediates: true });
          }
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
                  this.#setSlice("filesUploading", (previous) => ({
                    ...previous,
                    [file.uri]: progress,
                  }));
                },
              );
              this.#setSlice("filesUploading", (previous) => {
                const updated = { ...previous };
                delete updated[file.uri];
                return updated;
              });
              if (!result) return;
              const res = await this.#dbService.saveEncFile(folderId, outpath, {
                isVideo: file.mimeType?.startsWith("video"),
                previewSourceUri: file.uri,
              });
              if (res?.lastInsertRowId) successes++;
              this.#setSlice("files", (previous) =>
                previous.filter((f) => f.uri !== file.uri),
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
          this.#functions.unlockFolder();
        }
      }
    },

    unlockFolder: async () => {
      const folderId =
        this.#state.currentFolderId || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

      const isLocked = this.#state.folders[folderId] === "locked";

      let password = "";

      if (!isLocked || REPLACERS.isDev) {
        const passwords = storageManagement.get("VAULT_PASSWORD");
        if (passwords) {
          const correctPassword = passwords[folderId];
          password = correctPassword || "";
        }
      }

      if (!password) {
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
      }

      if (!password) return;

      if (REPLACERS.isWeb) {
        const files = await windowModule.loadEncryptedFiles(folderId, password);
        this.#setSlice("folders", (previous) => ({
          ...previous,
          [folderId]: files,
        }));
      } else {
        const dbFiles = await this.#dbService.getFolderFilesFromDB(folderId);
        this.#setSlice("folders", (previous) => ({
          ...previous,
          [folderId]: dbFiles,
        }));

        const directory = storageManagement.get("VAULT_DIRECTORY", "");
        const folderPath = new FileSystem.Directory(directory, folderId);
        const decryptedFiles = await decryptFolderFiles(
          folderPath.uri,
          password,
          (file) => {
            this.#setSlice("folders", (previous) => {
              const existingFiles = previous[folderId];
              if (!Array.isArray(existingFiles)) {
                return {
                  ...previous,
                  [folderId]: [{ ...file, decrypting: false }],
                };
              }

              const existingIndex = existingFiles.findIndex(
                (f) => f.originalUri === file.originalUri,
              );

              if (existingIndex === -1) {
                return {
                  ...previous,
                  [folderId]: [
                    ...existingFiles,
                    { ...file, decrypting: false },
                  ],
                };
              }

              const updated = [...existingFiles];
              const previousFile = updated[existingIndex];
              updated[existingIndex] = {
                ...previousFile,
                ...file,
                decrypting: false,
                previewUri: previousFile.previewUri,
              };

              return {
                ...previous,
                [folderId]: updated,
              };
            });
          },
        );

        this.#setSlice("folders", (previous) => {
          const existingFiles = previous[folderId];
          if (!Array.isArray(existingFiles)) {
            return {
              ...previous,
              [folderId]: decryptedFiles.map((file) => ({
                ...file,
                decrypting: false,
              })),
            };
          }

          const decryptedByUri = decryptedFiles.reduce(
            (acc, file) => {
              acc[file.originalUri] = file;
              return acc;
            },
            {} as Record<string, FolderFiles[number]>,
          );

          return {
            ...previous,
            [folderId]: existingFiles.map((file) => {
              const decrypted = decryptedByUri[file.originalUri];
              if (!decrypted) return file;

              return {
                ...file,
                ...decrypted,
                decrypting: false,
              };
            }),
          };
        });
      }
    },

    deleteFile: (file) => {
      const folderId =
        this.#state.currentFolderId || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

      const folderFiles = this.#state.folders[folderId];
      if (!folderFiles || folderFiles === "locked") return;

      const currentKey = getFileSelectionKey(file);

      this.#setSlice("folders", (previous) => ({
        ...previous,
        [folderId]: folderFiles.filter(
          (f) => f.originalUri !== file.originalUri,
        ),
      }));

      this.#setSlice("filesSelected", (previous) => {
        const updated = cloneDeep(previous);
        if (!updated.files[folderId]) return previous;

        delete updated.files[folderId][currentKey];
        if (!Object.keys(updated.files[folderId]).length)
          delete updated.files[folderId];
        if (!Object.keys(updated.files).length) updated.selecting = false;

        return updated;
      });

      [file.uri, file.originalUri, file.previewUri].forEach((uri) => {
        if (!uri) return;
        try {
          new FileSystem.File(uri).delete();
        } catch {
          // ignore error
        }
      });

      if (REPLACERS.isNative) {
        void (async () => {
          const result = await this.#dbService.deleteByUri(file.originalUri);
          if (!result.deletedRow?.video) return;

          try {
            new FileSystem.File(result.deletedRow.video).delete();
          } catch {
            // ignore error
          }
        })();
      }
    },

    actionWithFile: (action, item, folderId) => {
      const currentFolderId =
        this.#state.currentFolderId || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

      const directory = storageManagement.get("VAULT_DIRECTORY", "");
      const targetDir = new FileSystem.Directory(directory, folderId);
      const targetOriginalUri = new FileSystem.File(targetDir, item.name).uri;
      const nextItem = {
        ...item,
        originalUri: targetOriginalUri,
      };

      this.#setSlice("folders", (previous) => ({
        ...previous,
        ...(action === "copy"
          ? {}
          : {
              [currentFolderId]:
                previous[currentFolderId] === "locked"
                  ? "locked"
                  : previous[currentFolderId].filter(
                      (f) => f.originalUri !== item.originalUri,
                    ),
            }),
        [folderId]:
          previous[folderId] === "locked"
            ? "locked"
            : [...previous[folderId], nextItem],
      }));

      if (REPLACERS.isWeb) {
        windowModule.actionWithVaultItem(action, item, folderId);
      } else {
        void (async () => {
          const result = await actionWithVaultItem(action, item, folderId);
          if (!result.success) return;

          if (action === "move") {
            await this.#dbService.moveEncFile(
              item.originalUri,
              targetOriginalUri,
              folderId,
            );
          } else {
            await this.#dbService.saveEncFile(folderId, targetOriginalUri, {
              isVideo: item.mimeType?.startsWith("video"),
              previewSourceUri: item.uri,
            });
          }
        })();
      }
    },

    renameFile: (file, newName) => {
      const folderId =
        this.#state.currentFolderId || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;

      const folderFiles = this.#state.folders[folderId];
      if (!folderFiles || folderFiles === "locked") return;

      const nextOriginalUri = getEncryptedUriByName(file.originalUri, newName);

      this.#setSlice("folders", (previous) => ({
        ...previous,
        [folderId]: folderFiles.map((f) =>
          f.originalUri === file.originalUri
            ? { ...f, name: newName, originalUri: nextOriginalUri }
            : f,
        ),
      }));

      if (REPLACERS.isWeb) {
        windowModule.renameVaultItem(file, newName);
      } else {
        void (async () => {
          const result = await renameVaultItem(file, newName);
          if (!result.success) return;

          await this.#dbService.renameEncFile(
            file.originalUri,
            nextOriginalUri,
          );
        })();
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
      const currentFolderId =
        this.#state.currentFolderId || DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME;
      const fileKey = getFileSelectionKey(item);
      const isSelected =
        !!this.#state.filesSelected.files[currentFolderId]?.[fileKey];

      if (isSelected) {
        this.#setSlice("filesSelected", (previous) => {
          const updated = cloneDeep(previous);
          delete updated.files[currentFolderId][fileKey];
          if (!Object.keys(updated.files[currentFolderId]).length) {
            delete updated.files[currentFolderId];
          }

          if (!Object.keys(updated.files).length) updated.selecting = false;

          return updated;
        });
      } else {
        this.#setSlice("filesSelected", (previous) => {
          if (this.#state.folders[currentFolderId] === "locked")
            return previous;

          const updated = cloneDeep(previous);
          if (!updated.files[currentFolderId])
            updated.files[currentFolderId] = {};
          updated.selecting = true;
          updated.lastIndex =
            this.#state.folders[currentFolderId].indexOf(item) ?? null;
          updated.files[currentFolderId][fileKey] = true;
          return updated;
        });
      }
    },

    renameFolder: async (folderId, newName) => {
      this.#setSlice("folders", (previous) => {
        const updatedFolders = cloneDeep(previous);
        updatedFolders[newName] = cloneDeep(updatedFolders[folderId]);
        delete updatedFolders[folderId];
        return updatedFolders;
      });

      if (this.#state.currentFolderId === folderId) {
        this.#setSlice("currentFolderId", newName);
      }

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

        void this.#dbService.renameFolderId(folderId, newName);
      }
    },

    deleteFolder: async (folderId) => {
      this.#setSlice("filesSelected", (previous) => {
        const updated = cloneDeep(previous);
        delete updated.files[folderId];
        if (!Object.keys(updated.files).length) updated.selecting = false;
        return updated;
      });

      this.#setSlice("folders", (previous) => {
        const updatedFolders = cloneDeep(previous);
        delete updatedFolders[folderId];
        return updatedFolders;
      });

      if (this.#state.currentFolderId === folderId) {
        const nextFolder = Object.keys(this.#state.folders)[0] || "";
        this.#setSlice("currentFolderId", nextFolder);
      }

      if (REPLACERS.isWeb) {
        windowModule.deleteFolderVault(folderId);
      } else {
        const deletedRows = await this.#dbService.deleteByFolderId(folderId);
        deletedRows.deletedRows.forEach((row) => {
          [row.uri, row.video].forEach((uri) => {
            if (!uri) return;
            try {
              new FileSystem.File(uri).delete();
            } catch {
              // ignore error
            }
          });
        });
        if (folderId === DEFAULT_VAULT_DATA.DEFAULT_FOLDER_NAME) return;

        const directory = storageManagement.get("VAULT_DIRECTORY", "");
        try {
          const folderPath = new FileSystem.Directory(directory, folderId);
          folderPath.delete();
        } catch {
          // ignore error
        }
      }
    },
  };

  public getFunctions = (): VaultFunctions => this.#functions;
}

class VaultDomainServiceManager {
  #service: VaultDomainService | null = null;

  getService = () => {
    if (!this.#service) {
      this.#service = new VaultDomainService();
    }

    return this.#service;
  };

  cleanUp = async (force?: boolean) => {
    if (!this.#service && !force) return;

    await vaultServiceManager.cleanUp(() => {
      this.#service?.cleanUp();
      this.#service = null;
    }, force);
  };
}

export const vaultDomainServiceManager = new VaultDomainServiceManager();
