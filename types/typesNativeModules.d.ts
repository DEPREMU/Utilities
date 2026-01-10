import type {
  ExpectedStorageTypes,
  ALL_KEYS_STORAGE_TYPE,
} from "../common/both/keysStorage";
import { LanguagesSupported } from "./typesTranslations";
import { ExpectedNativeWebData } from "./typesUtilitiesForPC";

import type {
  ProgressEvent,
  VaultFolder,
  VaultItem,
  VaultSettings,
  VaultWrappedMasterKey,
  VaultAuthVerifier,
} from "./typesVault";

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
  "get-clipboard-history": {
    functionReturn: Promise<string[]>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "set-clipboard-history": {
    functionReturn: void;
    functionArgs: [items: string[]];
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

  "vault-pick-files": {
    functionReturn: Promise<{ canceled: boolean; paths: string[] }>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "vault-pick-folders": {
    functionReturn: Promise<{ canceled: boolean; paths: string[] }>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "vault-ensure-initialized": {
    functionReturn: Promise<{ ok: true } | { ok: false; error: string }>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "vault-load-settings": {
    functionReturn: Promise<VaultSettings | null>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "vault-save-settings": {
    functionReturn: Promise<{ ok: true } | { ok: false; error: string }>;
    functionArgs: [settings: VaultSettings];
    typeIpc: "invoke";
  };
  "vault-load-wrapped-master-key": {
    functionReturn: Promise<VaultWrappedMasterKey | null>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "vault-save-wrapped-master-key": {
    functionReturn: Promise<{ ok: true } | { ok: false; error: string }>;
    functionArgs: [data: VaultWrappedMasterKey];
    typeIpc: "invoke";
  };
  "vault-load-auth-verifier": {
    functionReturn: Promise<VaultAuthVerifier | null>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "vault-save-auth-verifier": {
    functionReturn: Promise<{ ok: true } | { ok: false; error: string }>;
    functionArgs: [data: VaultAuthVerifier];
    typeIpc: "invoke";
  };
  "vault-list-folders": {
    functionReturn: Promise<VaultFolder[]>;
    functionArgs: [];
    typeIpc: "invoke";
  };
  "vault-create-folder": {
    functionReturn: Promise<VaultFolder>;
    functionArgs: [
      folder: Omit<VaultFolder, "createdAt"> & { createdAt?: string },
    ];
    typeIpc: "invoke";
  };
  "vault-update-folder": {
    functionReturn: Promise<VaultFolder>;
    functionArgs: [folder: VaultFolder];
    typeIpc: "invoke";
  };
  "vault-delete-folder": {
    functionReturn: Promise<boolean>;
    functionArgs: [folderId: string];
    typeIpc: "invoke";
  };
  "vault-list-items": {
    functionReturn: Promise<VaultItem[]>;
    functionArgs: [folderId: string];
    typeIpc: "invoke";
  };
  "vault-save-item-metadata": {
    functionReturn: Promise<{ ok: true } | { ok: false; error: string }>;
    functionArgs: [item: VaultItem];
    typeIpc: "invoke";
  };
  "vault-delete-item": {
    functionReturn: Promise<boolean>;
    functionArgs: [folderId: string, itemId: string];
    typeIpc: "invoke";
  };
  "vault-unlock": {
    functionReturn: Promise<{ ok: true } | { ok: false; error: string }>;
    functionArgs: [password: string];
    typeIpc: "invoke";
  };
  "vault-lock": {
    functionReturn: void;
    functionArgs: [];
    typeIpc: "send";
  };
  "vault-encrypt-paths": {
    functionReturn: Promise<
      { ok: true; items: VaultItem[] } | { ok: false; error: string }
    >;
    functionArgs: [jobId: string, folderId: string, inputPaths: string[]];
    typeIpc: "invoke";
  };
  "vault-decrypt-to-temp": {
    functionReturn: Promise<
      { ok: true; tempPath: string } | { ok: false; error: string }
    >;
    functionArgs: [
      jobId: string,
      folderId: string,
      itemId: string,
      sessionId: string,
    ];
    typeIpc: "invoke";
  };
  "vault-clean-temp-session": {
    functionReturn: Promise<boolean>;
    functionArgs: [sessionId: string];
    typeIpc: "invoke";
  };
  "vault-cancel-job": {
    functionReturn: Promise<boolean>;
    functionArgs: [jobId: string];
    typeIpc: "invoke";
  };
  "vault-zip": {
    functionReturn: Promise<
      { ok: true; outputPath: string } | { ok: false; error: string }
    >;
    functionArgs: [jobId: string, inputPaths: string[], outputPath: string];
    typeIpc: "invoke";
  };
  "vault-unzip": {
    functionReturn: Promise<
      { ok: true; outputDir: string } | { ok: false; error: string }
    >;
    functionArgs: [jobId: string, zipPath: string, outputDir: string];
    typeIpc: "invoke";
  };
  "vault-export-backup": {
    functionReturn: Promise<
      { ok: true; outputDir: string } | { ok: false; error: string }
    >;
    functionArgs: [
      jobId: string,
      outputDir: string,
      mode: "sameKey" | "reencrypt",
      password?: string,
    ];
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
    readClipboard: () => string;
    setClipboard: (text: string) => void;
    notifyLoginStatus: (isLoggedIn: boolean) => void;
    turnOffComputer: () => ChannelsIpcRenderer["turn-off-computer"]["functionReturn"];
    restartComputer: () => ChannelsIpcRenderer["restart-computer"]["functionReturn"];
    setData: (
      ...args: ChannelsIpcRenderer["set-data-electron"]["functionArgs"]
    ) => void;
    saveData: <T extends ALL_KEYS_STORAGE_TYPE>(
      key: T,
      value: string
    ) => Promise<{ success: boolean }>;
    loadData: (
      ...args: ChannelsIpcRenderer["load-data"]["functionArgs"]
    ) => ChannelsIpcRenderer["load-data"]["functionReturn"];
    removeData: <T extends ALL_KEYS_STORAGE_TYPE>(
      key: T
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
    getClipboardHistory: (
      ...args: ChannelsIpcRenderer["get-clipboard-history"]["functionArgs"]
    ) => ChannelsIpcRenderer["get-clipboard-history"]["functionReturn"];
    setClipboardHistory: (
      ...args: ChannelsIpcRenderer["set-clipboard-history"]["functionArgs"]
    ) => ChannelsIpcRenderer["set-clipboard-history"]["functionReturn"];
    hideClipboardWindow: () => void;
    showClipboardWindow: () => void;
    onClipboardItemsUpdated: (
      callback: (items: Array<{ id: string; content: string }>) => void
    ) => void;

    vaultPickFiles: () => ChannelsIpcRenderer["vault-pick-files"]["functionReturn"];
    vaultPickFolders: () => ChannelsIpcRenderer["vault-pick-folders"]["functionReturn"];
    vaultEnsureInitialized: () => ChannelsIpcRenderer["vault-ensure-initialized"]["functionReturn"];
    vaultLoadSettings: () => ChannelsIpcRenderer["vault-load-settings"]["functionReturn"];
    vaultSaveSettings: (
      ...args: ChannelsIpcRenderer["vault-save-settings"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-save-settings"]["functionReturn"];
    vaultLoadWrappedMasterKey: () => ChannelsIpcRenderer["vault-load-wrapped-master-key"]["functionReturn"];
    vaultSaveWrappedMasterKey: (
      ...args: ChannelsIpcRenderer["vault-save-wrapped-master-key"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-save-wrapped-master-key"]["functionReturn"];
    vaultLoadAuthVerifier: () => ChannelsIpcRenderer["vault-load-auth-verifier"]["functionReturn"];
    vaultSaveAuthVerifier: (
      ...args: ChannelsIpcRenderer["vault-save-auth-verifier"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-save-auth-verifier"]["functionReturn"];
    vaultListFolders: () => ChannelsIpcRenderer["vault-list-folders"]["functionReturn"];
    vaultCreateFolder: (
      ...args: ChannelsIpcRenderer["vault-create-folder"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-create-folder"]["functionReturn"];
    vaultUpdateFolder: (
      ...args: ChannelsIpcRenderer["vault-update-folder"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-update-folder"]["functionReturn"];
    vaultDeleteFolder: (
      ...args: ChannelsIpcRenderer["vault-delete-folder"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-delete-folder"]["functionReturn"];
    vaultListItems: (
      ...args: ChannelsIpcRenderer["vault-list-items"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-list-items"]["functionReturn"];
    vaultSaveItemMetadata: (
      ...args: ChannelsIpcRenderer["vault-save-item-metadata"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-save-item-metadata"]["functionReturn"];
    vaultDeleteItem: (
      ...args: ChannelsIpcRenderer["vault-delete-item"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-delete-item"]["functionReturn"];
    vaultUnlock: (
      ...args: ChannelsIpcRenderer["vault-unlock"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-unlock"]["functionReturn"];
    vaultLock: () => void;
    vaultEncryptPaths: (
      ...args: ChannelsIpcRenderer["vault-encrypt-paths"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-encrypt-paths"]["functionReturn"];
    vaultDecryptToTemp: (
      ...args: ChannelsIpcRenderer["vault-decrypt-to-temp"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-decrypt-to-temp"]["functionReturn"];
    vaultCleanTempSession: (
      ...args: ChannelsIpcRenderer["vault-clean-temp-session"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-clean-temp-session"]["functionReturn"];
    vaultCancelJob: (
      ...args: ChannelsIpcRenderer["vault-cancel-job"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-cancel-job"]["functionReturn"];
    vaultZip: (
      ...args: ChannelsIpcRenderer["vault-zip"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-zip"]["functionReturn"];
    vaultUnzip: (
      ...args: ChannelsIpcRenderer["vault-unzip"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-unzip"]["functionReturn"];
    vaultExportBackup: (
      ...args: ChannelsIpcRenderer["vault-export-backup"]["functionArgs"]
    ) => ChannelsIpcRenderer["vault-export-backup"]["functionReturn"];
    onVaultProgress: (callback: (event: ProgressEvent) => void) => void;
  };
};

export type KeyboardLayout = string[][];

export type KeyboardModuleType = {
  sendKey: (key: string) => Promise<string>;
  backspace: () => Promise<boolean>;
  enter: () => Promise<boolean>;
  setLayout: (layout: KeyboardLayout) => Promise<boolean>;
  resetLayout: () => Promise<boolean>;
};
