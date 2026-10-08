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
import { Function } from "@types";

export type EventNativeModule = {
  actionId: ActionNotification;
  notificationId: number;
  title: string;
  message: string;
  reasonNotification: ReasonNotification;
  data: Record<string, unknown>;
};

export type MessagesClipboard =
  | {
      id: string;
      type: "delete";
    }
  | { type: "delete-all" };

type ExpectedStorageTypesBoth = ExpectedStorageTypes &
  ExpectedStorageTypes<"UNSECURE">;

export type ChannelsIpcRenderer<
  T extends ALL_KEYS_STORAGE_TYPE = keyof ExpectedStorageTypes<"BOTH">,
> = {
  "clipboard.read": {
    functionReturn: Promise<string>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "clipboard.set": {
    functionReturn: void;
    functionArgs: [text: string];
    typeIpc: "send";
  };
  "clipboard.deleteItem": {
    functionReturn: Promise<boolean>;
    functionArgs: [id: string];
    typeIpc: "invoke";
  };
  "clipboard.deleteAllItems": {
    functionReturn: Promise<boolean>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "clipboard.getHistory": {
    functionReturn: Promise<ClipboardItem[]>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "clipboard.setHistory": {
    functionReturn: void;
    functionArgs: [items: ClipboardItem[]];
    typeIpc: "send";
  };
  "clipboard.hideWindow": {
    functionReturn: void;
    functionArgs: [];
    typeIpc: "send";
  };
  "clipboard.showWindow": {
    functionReturn: void;
    functionArgs: [];
    typeIpc: "send";
  };

  "pdf.create": {
    functionReturn: Promise<PdfCreateResult | null>;
    functionArgs: [request: PdfCreateRequest];
    typeIpc: "invoke";
  };

  "storage.save": {
    functionReturn: Promise<{ success: boolean }>;
    functionArgs: [key: T, value: string];
    typeIpc: "invoke";
  };
  "storage.load": {
    functionReturn: Promise<string | null>;
    functionArgs: [key: T];
    typeIpc: "invoke";
  };
  "storage.remove": {
    functionReturn: Promise<boolean>;
    functionArgs: [key: T];
    typeIpc: "invoke";
  };

  "vault.authenticate": {
    functionReturn: Promise<boolean>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "vault.encryptFiles": {
    functionReturn: Promise<{
      success: boolean;
      errFiles?: PickedFile[];
    }>;
    functionArgs: [files: PickedFile[], password: string, folderId: string];
    typeIpc: "invoke";
  };
  "vault.loadEncryptedFiles": {
    functionReturn: Promise<FolderFiles>;
    functionArgs: [folderId: string, password: string];
    typeIpc: "invoke";
  };
  "vault.actionWithItem": {
    functionReturn: Promise<{ success: boolean; error?: string }>;
    functionArgs: [
      action: "copy" | "move",
      item: FolderFiles[number],
      targetFolderId: string,
    ];
    typeIpc: "invoke";
  };
  "vault.renameItem": {
    functionReturn: Promise<{ success: boolean; error?: string }>;
    functionArgs: [item: FolderFiles[number], newName: string];
    typeIpc: "invoke";
  };
  "vault.deleteFolder": {
    functionReturn: Promise<void>;
    functionArgs: [folderId: string];
    typeIpc: "invoke";
  };
  "vault.renameFolder": {
    functionReturn: Promise<void>;
    functionArgs: [oldFolderId: string, newFolderId: string];
    typeIpc: "invoke";
  };
  "vault.getExistingFolders": {
    functionReturn: Promise<string[]>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "vault.getSafeFolder": {
    functionReturn: Promise<string>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "vault.clearDecryptedFolder": {
    functionReturn: Promise<void>;
    functionArgs: [];
    typeIpc: "send";
  };

  "file.copyToTemp": {
    functionReturn: Promise<{
      success: boolean;
      info?: FileInfo;
    }>;
    functionArgs: [base64: string, fileName: string];
    typeIpc: "invoke";
  };
  "file.remove": {
    functionReturn: Promise<{ success: boolean }>;
    functionArgs: [uri: string];
    typeIpc: "invoke";
  };
  "file.pickFolder": {
    functionReturn: Promise<"canceled" | string>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "file.getInfo": {
    functionReturn: Promise<FileInfo | null>;
    functionArgs: [filePath: string];
    typeIpc: "invoke";
  };
  "file.askPath": {
    functionReturn: Promise<string | null>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "file.zip": {
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

  "system.turnOff": {
    functionReturn: Promise<boolean>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "system.restart": {
    functionReturn: Promise<boolean>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "system.getNativeData": {
    functionReturn: Promise<ExpectedNativeWebData[keyof ExpectedNativeWebData]>;
    functionArgs: [key: keyof ExpectedNativeWebData];
    typeIpc: "invoke";
  };
  "system.setData": {
    functionReturn: void;
    functionArgs: [deviceId: string, language: LanguagesSupported];
    typeIpc: "send";
  };
  "system.notifyLoginStatus": {
    functionReturn: void;
    functionArgs: [isLoggedIn: boolean];
    typeIpc: "send";
  };
  "system.executeCommand": {
    functionReturn: Promise<string>;
    functionArgs: [command: string];
    typeIpc: "invoke";
  };
  "system.isElectronBuild": {
    functionReturn: Promise<boolean>;
    functionArgs: [];
    typeIpc: "invoke";
  };

  "notification.send": {
    functionReturn: void;
    functionArgs: [notification: NotificationElectron];
    typeIpc: "send";
  };

  "network.hasInternetConnection": {
    functionReturn: Promise<boolean>;
    functionArgs: [];
    typeIpc: "invoke";
  };
};

export type NotificationElectron = {
  title: string;
  body: string;
  actions?: Array<{
    type: "button";
    text: string;
  }>;
  closeButtonText?: string;
  reasonNotification: ReasonNotification;
};

export type ClipboardBridge = {
  read: () => Promise<string>;
  set: (text: string) => void;
  deleteItem: (id: string) => Promise<boolean>;
  deleteAllItems: () => Promise<boolean>;
  getHistory: () => Promise<ClipboardItem[]>;
  setHistory: (items: ClipboardItem[]) => void;
  hideWindow: () => void;
  showWindow: () => void;
  onMessage: (
    callback: Function<[MessagesClipboard], void>,
  ) => { remove: () => void };
  onItemsUpdated: (
    callback: (items: ClipboardItem[]) => void,
  ) => { remove: () => void };
};

export type PdfBridge = {
  create: (
    request: PdfCreateRequest,
    onProgress?: (progress: number) => void,
  ) => Promise<PdfCreateResult | null>;
};

export type StorageBridge = {
  save: <T extends ALL_KEYS_STORAGE_TYPE>(
    key: T,
    value: string,
  ) => Promise<{ success: boolean }>;
  load: <T extends ALL_KEYS_STORAGE_TYPE>(
    key: T,
  ) => Promise<string | null>;
  remove: <T extends ALL_KEYS_STORAGE_TYPE>(
    key: T,
  ) => Promise<boolean>;
};

export type VaultBridge = {
  authenticate: () => Promise<boolean>;
  encryptFiles: (
    files: PickedFile[],
    password: string,
    folderId: string,
  ) => Promise<{ success: boolean; errFiles?: PickedFile[] }>;
  loadEncryptedFiles: (
    folderId: string,
    password: string,
  ) => Promise<FolderFiles>;
  actionWithItem: (
    action: "copy" | "move",
    item: FolderFiles[number],
    targetFolderId: string,
  ) => Promise<{ success: boolean; error?: string }>;
  renameItem: (
    item: FolderFiles[number],
    newName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteFolder: (folderId: string) => Promise<void>;
  renameFolder: (oldFolderId: string, newFolderId: string) => Promise<void>;
  getExistingFolders: () => Promise<string[]>;
  getSafeFolder: () => Promise<string>;
  clearDecryptedFolder: () => Promise<void>;
};

export type FileBridge = {
  copyToTemp: (
    base64: string,
    fileName: string,
  ) => Promise<{ success: boolean; info?: FileInfo }>;
  remove: (uri: string) => Promise<{ success: boolean }>;
  pickFolder: () => Promise<"canceled" | string>;
  getInfo: (filePath: string) => Promise<FileInfo | null>;
  askPath: () => Promise<string | null>;
  zip: (
    files: string[],
    outputPath: { folderName: string; path: string },
    password?: string,
    onProgress?: (
      progress: number,
      filename: string,
      fileCount: number,
    ) => void,
    onError?: (error: Error) => void,
  ) => Promise<string>;
};

export type SystemBridge = {
  turnOff: () => Promise<boolean>;
  restart: () => Promise<boolean>;
  getNativeData: <T extends keyof ExpectedNativeWebData>(
    key: T,
  ) => Promise<ExpectedNativeWebData[T]>;
  setData: (deviceId: string, language: LanguagesSupported) => void;
  notifyLoginStatus: (isLoggedIn: boolean) => void;
  executeCommand: (command: string) => Promise<string>;
  isElectronBuild: () => Promise<boolean>;
};

export type NotificationBridge = {
  send: (notification: NotificationElectron) => void;
};

export type NetworkBridge = {
  hasInternetConnection: () => Promise<boolean>;
};

export type ContextBridgeType = {
  UtilitiesForPC: {
    clipboard: ClipboardBridge;
    pdf: PdfBridge;
    storage: StorageBridge;
    vault: VaultBridge;
    file: FileBridge;
    system: SystemBridge;
    notification: NotificationBridge;
    network: NetworkBridge;
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
