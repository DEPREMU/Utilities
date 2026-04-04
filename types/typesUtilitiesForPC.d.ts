import { Server } from "http";
import type { Bonjour } from "bonjour-service";
import { ClipboardItem } from "./screens";
import { LanguagesSupported } from "./typesTranslations";
import { ReasonNotification } from "./typesNotifications";
import { ExpectedStorageTypes } from "./API";

export type ElectronStoreType = {
  get: <T extends keyof ExpectedStorageTypes<"BOTH">>(
    key: T,
  ) => string | undefined;
  set: <T extends keyof ExpectedStorageTypes<"BOTH">>(
    key: T,
    value: string,
  ) => void;
  delete: <T extends keyof ExpectedStorageTypes<"BOTH">>(key: T) => void;
};

export type DataAppElectron = {
  ad: Bonjour | null;
  PORT: 3005;
  tray: Electron.Tray | null;
  lanIP: string;
  server: Server | null;
  logPath: string;
  hasSudo: boolean;
  deviceId: string;
  username: string;
  userHome: string;
  language: LanguagesSupported;
  __dirname: string;
  machineId: string;
  isWindows: boolean;
  isUpdating: boolean;
  isQuitting: boolean;
  mainWindow: Electron.BrowserWindow | null;
  preloadPath: string;
  wasSleeping: boolean;
  SERVICE_NAME: string;
  webRestarted: boolean;
  downloadsPath: string;
  userIsLoggedIn: boolean;
  clipboardWindow: Electron.BrowserWindow | null;
  downloadFilePath: string;
  clipboardHistory: ClipboardItem[];
  reconnectAttempts: number;
  currentWebVersion: string;
  currentElectronVersion: string;
};

export type AdvertisementTXT = {
  lanIP: string;
  deviceId: string;
};

type NotificationsSaved = Record<ReasonNotification, (() => void) | null>;

export type ExpectedNativeWebData = {
  hasBattery: boolean | "unknown";
  version: string;
};

export type PdfPaperSize = "CUSTOM" | "GET_FROM_IMAGE" | string;

export type PdfImageInput = {
  uri: string;
  name: string;
};

export type PdfCreateOptions = {
  sizePdf: PdfPaperSize;
  customSize: {
    width: number;
    height: number;
  };
  maxSizePdf: number;
  filename: string;
};

export type PdfCreateRequest = {
  images: PdfImageInput[];
  options: PdfCreateOptions;
};

export type PdfCreateResult = {
  uri: string;
  fileName: string;
};
