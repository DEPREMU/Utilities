import {
  Prisma,
  NotesSettings,
  Notifications,
  VaultSettings,
  CryptosSettings,
  SerializableTask,
  AvailableFunctions,
  LanguagesSupported,
} from "@types";

export type ALL_KEYS_STORAGE_TYPE = keyof typeof ALL_KEYS_STORAGE;
export type SECURE_KEYS_STORAGE_TYPE = keyof typeof SECURE_KEYS_STORAGE;
export type UNSECURE_KEYS_STORAGE_TYPE = keyof typeof UNSECURE_KEYS_STORAGE;

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
  [symbol: string]: DB["Tables"]["Cryptos"];
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

export type PermissionsData = Record<Permission, DataPermission>;

export type ExpectedSecureStorageTypes = {
  DEVICE_ID: string;
  CLIPBOARD: ClipboardStorage;
  USER_DATA: Omit<DB["Tables"]["Users"], "password"> | null;
  STREAMERS:
    | (Prisma.StreamersGetPayload<{ omit: { createdAt: true } }> & {
        isLive: boolean;
      })[]
    | null;
  SESSION_EXPIRY: number | -1;
  NOTES_PASSWORD: string | null;
  VAULT_PASSWORD: { [folder: string]: string } | null;
  VAULT_DIRECTORY: string | null;
  CRYPTOS_SETTINGS: CryptosSettings | null;
  NETWORK_SETTINGS: NetworkSettings | null;
  PERMISSIONS_DATA: PermissionsData | null;
  LAST_UPDATE_CHECK: number | null;
  TERMINAL_COMMANDS: Command[] | null;
  DOWN_DETECTOR_DATA: DB["Tables"]["DownDetector"][] | null;
  USER_SESSION_TOKEN_STORAGE: string | null;
};

export type ExpectedUnsecureStorageTypes = {
  THEME: "light" | "dark" | "auto";
  API_URL: string | null;
  DEBUG: DEBUG_SETTINGS;
  LANGUAGE: LanguagesSupported;
  NOTIFICATIONS: Notifications;
  WEBSOCKET_URL: string | null;
  PENDING_TASKS: SerializableTask<AvailableFunctions>[] | null;
  VAULT_SETTINGS: VaultSettings | null;
  NOTES_SETTINGS: NotesSettings | null;
  HAS_ADMIN_ACCESS: boolean | null;
  CLIPBOARD_WEBSOCKET_URL: string | null;
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
};

export type ExpectedStorageTypes<
  T extends "SECURE" | "UNSECURE" | "BOTH" = "SECURE",
> = T extends "BOTH"
  ? ExpectedSecureStorageTypes & ExpectedUnsecureStorageTypes
  : T extends "SECURE"
    ? ExpectedSecureStorageTypes
    : ExpectedUnsecureStorageTypes;

export const SECURE_KEYS_STORAGE: Record<
  keyof ExpectedSecureStorageTypes,
  string
> = {
  USER_DATA: "_userData",
  DEVICE_ID: "_deviceId",
  CLIPBOARD: "_clipboard",
  STREAMERS: "_streamers",
  SESSION_EXPIRY: "_sessionExpiry",
  VAULT_PASSWORD: "_vaultPassword",
  NOTES_PASSWORD: "_notesPassword",
  VAULT_DIRECTORY: "_vaultDirectory",
  CRYPTOS_SETTINGS: "_cryptosSettings",
  PERMISSIONS_DATA: "_permissionsData",
  NETWORK_SETTINGS: "_networkSettings",
  LAST_UPDATE_CHECK: "_lastUpdateCheck",
  TERMINAL_COMMANDS: "_terminalCommands",
  DOWN_DETECTOR_DATA: "_downDetectorData",
  USER_SESSION_TOKEN_STORAGE: "_userSessionTokenStorage",
};

export const SECURE_KEYS_STORAGE_KEYS = Object.keys(
  SECURE_KEYS_STORAGE,
) as SECURE_KEYS_STORAGE_TYPE[];

export const SECURE_KEYS_STORAGE_VALUES: string[] =
  Object.values(SECURE_KEYS_STORAGE);

export const UNSECURE_KEYS_STORAGE: Record<
  keyof ExpectedUnsecureStorageTypes,
  string
> = {
  THEME: "@theme",
  DEBUG: "@debug",
  API_URL: "@API_URL",
  LANGUAGE: "@languageKeyStorage",
  PENDING_TASKS: "@pendingTasks",
  WEBSOCKET_URL: "@webSocketURL",
  NOTIFICATIONS: "@notifications",
  RECORDER_DATA: "@recorderData",
  VAULT_SETTINGS: "@vaultSettings",
  NOTES_SETTINGS: "@notesSettings",
  HAS_ADMIN_ACCESS: "@hasAdminAccess",
  CLIPBOARD_WEBSOCKET_URL: "@clipboardWebSocketURL",
};

export const UNSECURE_KEYS_STORAGE_KEYS = Object.keys(
  UNSECURE_KEYS_STORAGE,
) as UNSECURE_KEYS_STORAGE_TYPE[];

export const UNSECURE_KEYS_STORAGE_VALUES: string[] = Object.values(
  UNSECURE_KEYS_STORAGE,
);

export const ALL_KEYS_STORAGE = {
  ...SECURE_KEYS_STORAGE,
  ...UNSECURE_KEYS_STORAGE,
};

export const ALL_KEYS_STORAGE_KEYS = Object.keys(
  ALL_KEYS_STORAGE,
) as ALL_KEYS_STORAGE_TYPE[];

export const ALL_KEYS_STORAGE_VALUES: string[] =
  Object.values(ALL_KEYS_STORAGE);

export const DO_NOT_DELETE_OR_SAVE: ALL_KEYS_STORAGE_TYPE[] = [
  "DEVICE_ID",
  "RECORDER_DATA",
  "VAULT_SETTINGS",
  "VAULT_PASSWORD",
  "NOTES_PASSWORD",
  "VAULT_DIRECTORY",
  "NETWORK_SETTINGS",
] as const;

/**
 * Checks if a given storage key is a secure key that requires encrypted storage.
 *
 * @param key - The storage key to check against secure keys list
 * @returns A type predicate indicating whether the key is a secure storage key
 */
export const isSecureKey = (
  key: ALL_KEYS_STORAGE_TYPE,
): key is SECURE_KEYS_STORAGE_TYPE => {
  return SECURE_KEYS_STORAGE_KEYS.includes(key as SECURE_KEYS_STORAGE_TYPE);
};
