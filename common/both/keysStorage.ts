import {
  Cryptos,
  Streamer,
  UserData,
  DownDetector,
  Notifications,
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
  symbol: string;
  price: number;
}[];

export type SelectedCryptos = Record<string, Cryptos>;

export type ExpectedSecureStorageTypes = {
  DEVICE_ID: string;
  USER_DATA: Omit<UserData, "password"> | null;
  STREAMERS: (Streamer & { isLive: boolean })[] | null;
  SESSION_EXPIRY: number | -1;
  SELECTED_CRYPTOS: SelectedCryptos | null;
  LAST_UPDATE_CHECK: number | null;
  TERMINAL_COMMANDS: Command[] | null;
  DOWN_DETECTOR_DATA: DownDetector[] | null;
  USER_SESSION_TOKEN_STORAGE: string | null;
};

export type ExpectedUnsecureStorageTypes = {
  THEME: "light" | "dark" | "auto";
  API_URL: string | null;
  LANGUAGE: LanguagesSupported;
  PENDING_TASKS: SerializableTask<AvailableFunctions>[] | null;
  WEBSOCKET_URL: string | null;
  NOTIFICATIONS: Notifications;
  HAS_ADMIN_ACCESS: boolean | null;
  CLIPBOARD_WEBSOCKET_URL: string | null;
  RECORDER_DATA: {
    lastUri: string;
    quality: "low" | "high";
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
  STREAMERS: "_streamers",
  SESSION_EXPIRY: "_sessionExpiry",
  SELECTED_CRYPTOS: "_selectedCryptos",
  LAST_UPDATE_CHECK: "_lastUpdateCheck",
  TERMINAL_COMMANDS: "_terminalCommands",
  DOWN_DETECTOR_DATA: "_downDetectorData",
  USER_SESSION_TOKEN_STORAGE: "_userSessionTokenStorage",
};

export const [SECURE_KEYS_STORAGE_KEYS, SECURE_KEYS_STORAGE_VALUES] =
  Object.entries(SECURE_KEYS_STORAGE) as unknown as [
    (keyof typeof SECURE_KEYS_STORAGE)[],
    string[],
  ];

export const UNSECURE_KEYS_STORAGE: Record<
  keyof ExpectedUnsecureStorageTypes,
  string
> = {
  THEME: "@theme",
  API_URL: "@API_URL",
  LANGUAGE: "@languageKeyStorage",
  PENDING_TASKS: "@pendingTasks",
  WEBSOCKET_URL: "@webSocketURL",
  NOTIFICATIONS: "@notifications",
  RECORDER_DATA: "@recorderData",
  HAS_ADMIN_ACCESS: "@hasAdminAccess",
  CLIPBOARD_WEBSOCKET_URL: "@clipboardWebSocketURL",
};

export const [UNSECURE_KEYS_STORAGE_KEYS, UNSECURE_KEYS_STORAGE_VALUES] =
  Object.entries(UNSECURE_KEYS_STORAGE) as unknown as [
    (keyof typeof UNSECURE_KEYS_STORAGE)[],
    string[],
  ];

export const ALL_KEYS_STORAGE = {
  ...SECURE_KEYS_STORAGE,
  ...UNSECURE_KEYS_STORAGE,
};

export const [ALL_KEYS_STORAGE_KEYS, ALL_KEYS_STORAGE_VALUES] = Object.entries(
  ALL_KEYS_STORAGE
) as unknown as [(keyof typeof ALL_KEYS_STORAGE)[], string[]];

/**
 * Checks if a given storage key is a secure key that requires encrypted storage.
 *
 * @param key - The storage key to check against secure keys list
 * @returns A type predicate indicating whether the key is a secure storage key
 */
export const isSecureKey = (
  key: ALL_KEYS_STORAGE_TYPE
): key is SECURE_KEYS_STORAGE_TYPE => {
  return SECURE_KEYS_STORAGE_KEYS.includes(key as SECURE_KEYS_STORAGE_TYPE);
};
