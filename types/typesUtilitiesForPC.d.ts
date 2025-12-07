import { Server } from "http";
import type { Tray } from "electron";
import { Advertisement } from "dnssd";
import { LanguagesSupported } from "./typesTranslations";
import { ReasonNotification } from "./typesNotifications";
import { ExpectedStorageTypes } from "./API";

export type ElectronStoreType = {
  get: <T extends keyof ExpectedStorageTypes<"BOTH">>(
    key: T
  ) => string | undefined;
  set: <T extends keyof ExpectedStorageTypes<"BOTH">>(
    key: T,
    value: string
  ) => void;
  delete: <T extends keyof ExpectedStorageTypes<"BOTH">>(key: T) => void;
};

export type DataAppElectron = {
  ad: Advertisement | null;
  PORT: 3005;
  tray: typeof Tray | null;
  lanIP: string;
  server: Server | null;
  logPath: string;
  hasSudo: boolean;
  deviceId: string;
  username: string;
  userHome: string;
  language: LanguagesSupported;
  __dirname: string;
  isWindows: boolean;
  isUpdating: boolean;
  isQuitting: boolean;
  mainWindow: Electron.BrowserWindow | null;
  wasSleeping: boolean;
  SERVICE_NAME: string;
  webRestarted: boolean;
  encryptionKey: string;
  userIsLoggedIn: boolean;
  downloadFilePath: string;
  reconnectAttempts: number;
  currentWebVersion: string;
  currentElectronVersion: string;
};

export type AdvertisementTXT = {
  lanIP: string;
  deviceId: string;
};

type NotificationsSaved = Record<ReasonNotification, (() => void) | null>;

type ExpectedNativeWebData = {
  hasBattery: boolean | "unknown";
  version: string;
};
