import type {
  Theme,
  Prisma,
  NotesSettings,
  Notifications,
  VaultSettings,
  ScreensAvailable,
  LanguagesSupported,
  PersonalStickerConfig,
} from "@types";
import { Helper } from "./helpers";

export type SECURE_KEYS_STORAGE_TYPE = keyof ExpectedSecureStorageTypes;
export type UNSECURE_KEYS_STORAGE_TYPE = keyof ExpectedUnsecureStorageTypes;
export type ALL_KEYS_STORAGE_TYPE =
  SECURE_KEYS_STORAGE_TYPE | UNSECURE_KEYS_STORAGE_TYPE;

export type KeyStorageValues<
  T extends "SECURE" | "UNSECURE" | "ALL" = "SECURE",
> = T extends "SECURE"
  ? SECURE_KEYS_STORAGE_TYPE
  : T extends "UNSECURE"
    ? UNSECURE_KEYS_STORAGE_TYPE
    : ALL_KEYS_STORAGE_TYPE;

export type Command = {
  when: "Start-up" | "Shut-down";
  command: string;
};

export type PriceBinanceAPI = {
  price: number;
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
}[];

export type SelectedCryptos = {
  [symbol: string]: DB["TablesClient"]["Cryptos"];
};

export type ClipboardStorage = {
  enabled: boolean;
  maxCharsInItem: number;
  maxClipboardItems: number;
};

export const PERMISSIONS = [
  "overlay",
  "location",
  "autoStart",
  "doNotDisturb",
  "batteryOptimization",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type DataPermission = {
  enabled: boolean;
  lastAsked: number | null;
  doNotAskAgain: boolean;
};
export type NetworkSettings = {
  fetchWithCellularData: boolean;
};

export type DEBUG_SETTINGS = {
  appAliveCheck: boolean;
};

export type ScreensConfig = Record<
  Exclude<ScreensAvailable, "Minesweeper">,
  { keepLoaded?: boolean }
>;

export type PermissionsData = Record<Permission, DataPermission>;

export type ExpectedSecureStorageTypes = {
  DEVICE_ID: string;
  CLIPBOARD: ClipboardStorage;
  USER_DATA: Omit<DB["TablesClient"]["Users"], "password"> | null;
  STREAMERS:
    | (Prisma.StreamersGetPayload<{ omit: { createdAt: true } }> & {
        isLive: boolean;
      })[]
    | null;
  SESSION_EXPIRY: number | -1;
  NOTES_PASSWORD: string | null;
  VAULT_PASSWORD: { [folder: string]: string } | null;
  VAULT_DIRECTORY: string | null;
  WHATSAPP_CONFIG: PersonalStickerConfig | null;
  CRYPTOS_SETTINGS: DB["TablesClient"]["CryptosSettings"] | null;
  NETWORK_SETTINGS: NetworkSettings | null;
  PERMISSIONS_DATA: PermissionsData | null;
  LAST_UPDATE_CHECK: number | null;
  TERMINAL_COMMANDS: Command[] | null;
  DOWN_DETECTOR_DATA: DB["TablesClient"]["DownDetector"][] | null;
  USER_SESSION_TOKEN_STORAGE: string | null;
};

export type ExpectedUnsecureStorageTypes = {
  DEBUG: DEBUG_SETTINGS;
  LANGUAGE: LanguagesSupported;
  NOTIFICATIONS: Notifications;
  SCREENS_CONFIG: ScreensConfig | null;
  VAULT_SETTINGS: VaultSettings | null;
  NOTES_SETTINGS: NotesSettings | null;
  HAS_ADMIN_ACCESS: boolean | null;
  RECORDER_DATA: {
    lastUri: string;
    quality: "low" | "medium" | "high" | "lossless";
    maxXUris: number;
    lastXUris: string[];
    isRecording: boolean;
    infiniteRecord: boolean;
    secondsRecorded: number;
    intervalOfSaves: number;
    shouldAutoStart: boolean;
  } | null;
  APP_BEHAVIOR: {
    theme: Theme;
    useAnimations: boolean;
  };
};

export type ExpectedStorageTypes<
  T extends "SECURE" | "UNSECURE" | "BOTH" = "SECURE",
> = T extends "BOTH"
  ? ExpectedSecureStorageTypes & ExpectedUnsecureStorageTypes
  : T extends "SECURE"
    ? ExpectedSecureStorageTypes
    : ExpectedUnsecureStorageTypes;

export const SECURE_KEYS_STORAGE = {
  USER_DATA: "_userData",
  DEVICE_ID: "_deviceId",
  CLIPBOARD: "_clipboard",
  STREAMERS: "_streamers",
  SESSION_EXPIRY: "_sessionExpiry",
  VAULT_PASSWORD: "_vaultPassword",
  NOTES_PASSWORD: "_notesPassword",
  WHATSAPP_CONFIG: "_whatsappConfig",
  VAULT_DIRECTORY: "_vaultDirectory",
  CRYPTOS_SETTINGS: "_cryptosSettings",
  PERMISSIONS_DATA: "_permissionsData",
  NETWORK_SETTINGS: "_networkSettings",
  LAST_UPDATE_CHECK: "_lastUpdateCheck",
  TERMINAL_COMMANDS: "_terminalCommands",
  DOWN_DETECTOR_DATA: "_downDetectorData",
  USER_SESSION_TOKEN_STORAGE: "_userSessionTokenStorage",
} satisfies Record<keyof ExpectedSecureStorageTypes, string>;

export const UNSECURE_KEYS_STORAGE = {
  DEBUG: "@debug",
  LANGUAGE: "@languageKeyStorage",
  APP_BEHAVIOR: "@appBehavior",
  NOTIFICATIONS: "@notifications",
  RECORDER_DATA: "@recorderData",
  VAULT_SETTINGS: "@vaultSettings",
  SCREENS_CONFIG: "@screensConfig",
  NOTES_SETTINGS: "@notesSettings",
  HAS_ADMIN_ACCESS: "@hasAdminAccess",
} satisfies Record<keyof ExpectedUnsecureStorageTypes, string>;

export const ALL_KEYS_STORAGE = {
  ...SECURE_KEYS_STORAGE,
  ...UNSECURE_KEYS_STORAGE,
};

export const ALL_KEYS_STORAGE_KEYS = Helper.Object.keys(ALL_KEYS_STORAGE);

export const DO_NOT_DELETE_OR_SAVE = new Set([
  "DEVICE_ID",
  "RECORDER_DATA",
  "VAULT_SETTINGS",
  "VAULT_PASSWORD",
  "NOTES_PASSWORD",
  "VAULT_DIRECTORY",
  "WHATSAPP_CONFIG",
  "NETWORK_SETTINGS",
]) satisfies Set<ALL_KEYS_STORAGE_TYPE>;

export const SECURE_KEYS_STORAGE_KEYS = new Set<SECURE_KEYS_STORAGE_TYPE>(
  Helper.Object.keys(SECURE_KEYS_STORAGE),
);

/**
 * Checks if a given storage key is a secure key that requires encrypted storage.
 *
 * @param key - The storage key to check against secure keys list
 * @returns A type predicate indicating whether the key is a secure storage key
 */
export const isSecureKey = (
  key: ALL_KEYS_STORAGE_TYPE,
): key is SECURE_KEYS_STORAGE_TYPE => {
  return SECURE_KEYS_STORAGE_KEYS.has(key as SECURE_KEYS_STORAGE_TYPE);
};
