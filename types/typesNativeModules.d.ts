import type {
  ExpectedStorageTypes,
  ALL_KEYS_STORAGE_TYPE,
} from "../common/both/keysStorage";
import {
  PdfCreateResult,
  PdfCreateRequest,
  ExpectedNativeWebData,
} from "./typesUtilitiesForPC";
import { FolderFiles } from "./typesVault";
import { ClipboardItem } from "./screens";
import { LanguagesSupported } from "./typesTranslations";
import type { FileInfo, PickedFile } from "./typesVault";
import { ActionNotification, ReasonNotification } from "./typesNotifications";

export type EventNativeModule = {
  actionId: ActionNotification;
  notificationId: number;
  title: string;
  message: string;
  reasonNotification: ReasonNotification;
  data: Record<string, unknown>;
};

type ExpectedStorageTypesBoth = ExpectedStorageTypes &
  ExpectedStorageTypes<"UNSECURE">;

export type ChannelsIpcRenderer<
  T extends ALL_KEYS_STORAGE_TYPE = keyof ExpectedStorageTypes<"BOTH">,
> = {
  "read-clipboard": {
    functionArgs: [];
    functionReturn: Promise<string>;
    typeIpc: "invoke";
  };
  "set-clipboard": {
    functionArgs: [text: string];
    functionReturn: void;
    typeIpc: "send";
  };
  "user-login-status": {
    functionArgs: [isLoggedIn: boolean];
    functionReturn: void;
    typeIpc: "send";
  };
  "set-data-electron": {
    functionArgs: [deviceId: string, language: LanguagesSupported];
    functionReturn: void;
    typeIpc: "send";
  };
  "turn-off-computer": {
    functionArgs: [];
    functionReturn: Promise<boolean>;
    typeIpc: "invoke";
  };
  "restart-computer": {
    functionArgs: [];
    functionReturn: Promise<boolean>;
    typeIpc: "invoke";
  };
  "save-data": {
    functionReturn: Promise<{ success: boolean }>;
    functionArgs: [key: T, value: string];
    typeIpc: "invoke";
  };
  "load-data": {
    functionArgs: [key: T];
    functionReturn: Promise<string | null>;
    typeIpc: "invoke";
  };
  "remove-data": {
    functionReturn: boolean | Promise<boolean>;
    functionArgs: [key: T];
    typeIpc: "invoke";
  };
  "is-electron-build": {
    functionReturn: Promise<boolean>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "get-native-data": {
    functionReturn: Promise<ExpectedNativeWebData[keyof ExpectedNativeWebData]>;
    functionArgs: [key: keyof ExpectedNativeWebData];
    typeIpc: "invoke";
  };
  "send-notification": {
    functionReturn: void;
    functionArgs: [args: NotificationElectron];
    typeIpc: "send";
  };
  "execute-command": {
    functionReturn: Promise<string>;
    functionArgs: [command: string];
    typeIpc: "invoke";
  };
  "create-pdf": {
    functionReturn: Promise<PdfCreateResult | null>;
    functionArgs: [
      request: PdfCreateRequest,
      onProgress?: (progress: number) => void,
    ];
    typeIpc: "invoke";
  };
  "get-clipboard-history": {
    functionReturn: Promise<ClipboardItem[]>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "set-clipboard-history": {
    functionReturn: void;
    functionArgs: [items: ClipboardItem[]];
    typeIpc: "send";
  };
  "hide-clipboard-window": {
    functionReturn: void;
    functionArgs: [];
    typeIpc: "send";
  };
  "show-clipboard-window": {
    functionReturn: void;
    functionArgs: [];
    typeIpc: "send";
  };

  "authenticate-user": {
    functionReturn: Promise<boolean>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "copy-file-to-temp": {
    functionReturn: Promise<{
      success: boolean;
      info?: FileInfo;
    }>;
    functionArgs: [base64: string, fileName: string];
    typeIpc: "invoke";
  };
  "remove-file-with-uri": {
    functionReturn: Promise<{ success: boolean }>;
    functionArgs: [uri: string];
    typeIpc: "invoke";
  };
  "get-safe-folder": {
    functionReturn: Promise<string>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "pick-folder": {
    functionReturn: Promise<"canceled" | string>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "encrypt-vault-items": {
    functionReturn: Promise<{
      success: boolean;
      errFiles?: PickedFile[];
    }>;
    functionArgs: [files: PickedFile[], password: string, folderId: string];
    typeIpc: "invoke";
  };
  "load-encrypted-files": {
    functionReturn: Promise<FolderFiles>;
    functionArgs: [folderId: string, password: string];
    typeIpc: "invoke";
  };
  "action-with-vault-item": {
    functionReturn: Promise<{ success: boolean; error?: string }>;
    functionArgs: [
      action: "copy" | "move",
      item: FolderFiles[number],
      targetFolderId: string,
    ];
    typeIpc: "invoke";
  };
  "rename-vault-item": {
    functionReturn: Promise<{ success: boolean; error?: string }>;
    functionArgs: [item: FolderFiles[number], newName: string];
    typeIpc: "invoke";
  };
  "get-file-info": {
    functionReturn: Promise<FileInfo | null>;
    functionArgs: [filePath: string];
    typeIpc: "invoke";
  };
  "clear-decrypted-folder-directory": {
    functionReturn: Promise<void>;
    functionArgs: [];
    typeIpc: "send";
  };
  "ask-path": {
    functionReturn: Promise<string | null>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "zip-folder": {
    functionReturn: Promise<string>;
    functionArgs: [
      files: string[],
      outputPath: { folderName: string; path: string },
      password?: string,
      onProgress?: (
        progress: number,
        filename: string,
        fileCount: number,
      ) => void,
      onError?: (error: Error) => void,
    ];
    typeIpc: "invoke";
  };
  "delete-folder": {
    functionReturn: Promise<void>;
    functionArgs: [folderId: string];
    typeIpc: "invoke";
  };
  "rename-folder": {
    functionReturn: Promise<void>;
    functionArgs: [oldFolderId: string, newFolderId: string];
    typeIpc: "invoke";
  };
  "get-existing-vault-folders": {
    functionReturn: Promise<string[]>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "has-internet-connection": {
    functionReturn: Promise<boolean>;
    functionArgs: [];
    typeIpc: "invoke";
  };
};

type NotificationElectron = {
  title: string;
  body: string;
  actions?: Array<{
    type: "button";
    text: string;
  }>;
  closeButtonText?: string;
  reasonNotification: ReasonNotification;
};

export type ContextBridgeType = {
  UtilitiesForPC: {
    readClipboard: () => Promise<string>;
    setClipboard: (text: string) => void;
    notifyLoginStatus: (isLoggedIn: boolean) => void;
    turnOffComputer: () => ChannelsIpcRenderer["turn-off-computer"]["functionReturn"];
    restartComputer: () => ChannelsIpcRenderer["restart-computer"]["functionReturn"];
    setData: (
      ...args: ChannelsIpcRenderer["set-data-electron"]["functionArgs"]
    ) => void;
    saveData: <T extends ALL_KEYS_STORAGE_TYPE>(
      key: T,
      value: string,
    ) => Promise<{ success: boolean }>;
    loadData: (
      ...args: ChannelsIpcRenderer["load-data"]["functionArgs"]
    ) => ChannelsIpcRenderer["load-data"]["functionReturn"];
    removeData: <T extends ALL_KEYS_STORAGE_TYPE>(
      key: T,
    ) => Promise<ChannelsIpcRenderer<T>["remove-data"]["functionReturn"]>;
    isElectronBuild: () => Promise<boolean>;
    sendNotification: (
      ...args: ChannelsIpcRenderer["send-notification"]["functionArgs"]
    ) => void;
    getNativeData: (
      ...args: ChannelsIpcRenderer["get-native-data"]["functionArgs"]
    ) => ChannelsIpcRenderer["get-native-data"]["functionReturn"];
    executeCommand: (
      ...args: ChannelsIpcRenderer["execute-command"]["functionArgs"]
    ) => ChannelsIpcRenderer["execute-command"]["functionReturn"];
    createPdf: (
      ...args: ChannelsIpcRenderer["create-pdf"]["functionArgs"]
    ) => ChannelsIpcRenderer["create-pdf"]["functionReturn"];
    getClipboardHistory: (
      ...args: ChannelsIpcRenderer["get-clipboard-history"]["functionArgs"]
    ) => ChannelsIpcRenderer["get-clipboard-history"]["functionReturn"];
    setClipboardHistory: (
      ...args: ChannelsIpcRenderer["set-clipboard-history"]["functionArgs"]
    ) => ChannelsIpcRenderer["set-clipboard-history"]["functionReturn"];
    hideClipboardWindow: () => void;
    showClipboardWindow: () => void;
    onClipboardItemsUpdated: (
      callback: (items: Array<{ id: string; content: string }>) => void,
    ) => void;

    authenticate: () => Promise<boolean>;
    copyFileToTemp: (
      ...args: ChannelsIpcRenderer["copy-file-to-temp"]["functionArgs"]
    ) => ChannelsIpcRenderer["copy-file-to-temp"]["functionReturn"];
    removeFile: (
      ...args: ChannelsIpcRenderer["remove-file-with-uri"]["functionArgs"]
    ) => ChannelsIpcRenderer["remove-file-with-uri"]["functionReturn"];
    getSafeFolder: () => ChannelsIpcRenderer["get-safe-folder"]["functionReturn"];
    pickFolder: () => ChannelsIpcRenderer["pick-folder"]["functionReturn"];
    encryptFiles: (
      ...args: ChannelsIpcRenderer["encrypt-vault-items"]["functionArgs"]
    ) => ChannelsIpcRenderer["encrypt-vault-items"]["functionReturn"];
    loadEncryptedFiles: (
      ...args: ChannelsIpcRenderer["load-encrypted-files"]["functionArgs"]
    ) => ChannelsIpcRenderer["load-encrypted-files"]["functionReturn"];
    actionWithVaultItem: (
      ...args: ChannelsIpcRenderer["action-with-vault-item"]["functionArgs"]
    ) => ChannelsIpcRenderer["action-with-vault-item"]["functionReturn"];
    renameVaultItem: (
      ...args: ChannelsIpcRenderer["rename-vault-item"]["functionArgs"]
    ) => ChannelsIpcRenderer["rename-vault-item"]["functionReturn"];
    getFileInfo: (
      ...args: ChannelsIpcRenderer["get-file-info"]["functionArgs"]
    ) => ChannelsIpcRenderer["get-file-info"]["functionReturn"];
    clearDecryptedFolderDirectory: () => ChannelsIpcRenderer["clear-decrypted-folder-directory"]["functionReturn"];
    askPath: () => ChannelsIpcRenderer["ask-path"]["functionReturn"];
    zipFolder: (
      ...args: ChannelsIpcRenderer["zip-folder"]["functionArgs"]
    ) => ChannelsIpcRenderer["zip-folder"]["functionReturn"];
    deleteFolderVault: (
      ...args: ChannelsIpcRenderer["delete-folder"]["functionArgs"]
    ) => ChannelsIpcRenderer["delete-folder"]["functionReturn"];
    renameFolderVault: (
      ...args: ChannelsIpcRenderer["rename-folder"]["functionArgs"]
    ) => ChannelsIpcRenderer["rename-folder"]["functionReturn"];
    getExistingVaultFolders: () => ChannelsIpcRenderer["get-existing-vault-folders"]["functionReturn"];
    hasInternetConnection: () => ChannelsIpcRenderer["has-internet-connection"]["functionReturn"];
  };
};

export type KeyboardLayout = string[][];

export type GrammarSuggestion = {
  replacement: string;
  confidence: number;
};

export type KeyboardModuleType = {
  enter: () => Promise<boolean>;
  sendKey: (key: string) => Promise<string>;
  backspace: () => Promise<boolean>;
  setLayout: (layout: KeyboardLayout) => Promise<boolean>;
  resetLayout: () => Promise<boolean>;
};
