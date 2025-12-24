import type {
  ExpectedStorageTypes,
  ALL_KEYS_STORAGE_TYPE,
} from "../common/both/keysStorage";
import { LanguagesSupported } from "./typesTranslations";
import { ExpectedNativeWebData } from "./typesUtilitiesForPC";

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

type ChannelsIpcRenderer<
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
