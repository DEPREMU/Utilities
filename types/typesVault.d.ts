import * as ExpoFileSystem from "expo-file-system";
import { DownloadableMimeType } from "./typesStorage";

export type FileInfo = {
  uri: string;
  name: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  extension: string;
  mimeType?: DownloadableMimeType;
};

export type VaultSettings = {
  autoLockSeconds: number;
};

export type PickedFile = {
  uri: string;
  name: string;
  size: number | null;
  mimeType: DownloadableMimeType | null;
};

export type VaultFolderFile = PickedFile & {
  originalUri: string;
  previewUri?: string | null;
  decrypting?: boolean;
};

export type FolderFiles = VaultFolderFile[];

export type EncryptFile = (
  inputPath: string,
  outputPath: string,
  password: string,
  onProgress?: (percentage: number) => void,
) => Promise<boolean>;

export declare const encryptFile: EncryptFile;

export type DecryptFile = (
  inputPath: string,
  outputPath: string,
  password: string,
  onProgress?: (percentage: number) => void,
) => Promise<boolean>;

export declare const decryptFile: DecryptFile;

export type DecryptFolderFiles = (
  folder: string,
  password: string,
  onDecryptedFile?: (file: FolderFiles[number]) => void,
) => Promise<FolderFiles>;

export declare const decryptFolderFiles: DecryptFolderFiles;

export type ActionWithVaultItem = (
  action: "copy" | "move",
  item: FolderFiles[number],
  targetFolderId: string,
) => Promise<{ success: boolean; error?: string }>;

export declare const actionWithVaultItem: ActionWithVaultItem;

export type RenameVaultItem = (
  item: FolderFiles[number],
  newName: string,
) => Promise<{ success: boolean; error?: string }>;

export declare const renameVaultItem: RenameVaultItem;

export type FetchFileInfo = (uri: string) => Promise<FileInfo | null>;

export declare const fetchFileInfo: FetchFileInfo;

export type ClearDecryptedFolderDirectory = () => Promise<void>;

export declare const clearDecryptedFolderDirectory: ClearDecryptedFolderDirectory;

export type GetDecryptedFolderDirectory = () => ExpoFileSystem.Directory;

export type HasPasswordZIP = (filePath: string) => Promise<boolean>;

export declare const hasPasswordZIP: HasPasswordZIP;

export type UnzipFile = (
  filePath: string,
  destinationPath: string,
  onPasswordRequired?: () => Promise<string | null>,
) => Promise<string[]>;

export declare const unzipFile: UnzipFile;

export type ZipFile = (
  sourcePaths: string[],
  onProgress: (percentage: number) => void,
  password?: string,
  onZip?: (path: string, deleteTempFile: () => void) => unknown,
) => Promise<string>;

export declare const zipFile: ZipFile;

export type GetFoldersVault = () => Promise<string[]>;

export declare const getFoldersVault: GetFoldersVault;

export type getDefaultVaultDirectory = () => Promise<ExpoFileSystem.Directory>;

export declare const getDefaultVaultDirectory: getDefaultVaultDirectory;

export type GetImageFromVideo = (videoUri: string) => Promise<string | null>;

export declare const getImageFromVideo: GetImageFromVideo;
