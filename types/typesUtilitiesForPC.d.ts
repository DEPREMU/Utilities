import { Server } from "http";
import { Advertisement } from "dnssd";
import { LanguagesSupported } from "./typesTranslations";
import { ReasonNotification } from "./typesNotifications";
import { ExpectedStorageTypes } from "./typesAPI";

export type ElectronStoreType = {
  get: <T extends keyof ExpectedStorageTypes<"UNSECURE">>(
    key: T
  ) => string | undefined;
  set: <T extends keyof ExpectedStorageTypes<"UNSECURE">>(
    key: T,
    value: string
  ) => void;
  delete: <T extends keyof ExpectedStorageTypes<"UNSECURE">>(key: T) => void;
};

export type DataAppElectron = {
  ad: Advertisement | null;
  PORT: 3005;
  tray: Electron.Tray | null;
  lanIP: string;
  server: Server | null;
  logPath: string;
  hasSudo: boolean;
  deviceId: string;
  language: LanguagesSupported;
  __dirname: string;
  isWindows: boolean;
  isQuitting: boolean;
  mainWindow: Electron.BrowserWindow | null;
  wasSleeping: boolean;
  SERVICE_NAME: string;
  webRestarted: boolean;
  encryptionKey: string;
  userIsLoggedIn: boolean;
  reconnectAttempts: number;
};

export type AdvertisementTXT = {
  lanIP: string;
  deviceId: string;
};

type NotificationsSaved = Record<ReasonNotification, (() => void) | null>;

type ExpectedNativeWebData = {
  hasBattery: boolean | "unknown";
};
