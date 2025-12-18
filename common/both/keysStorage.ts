export const SECURE_KEYS_STORAGE = [
  "_userData",
  "_deviceId",
  "_Streamers",
  "_sessionExpiry",
  "_selectedCryptos",
  "_lastUpdateCheck",
  "_downDetectorData",
  "_terminalCommands",
  "_userSessionTokenStorage",
] as const;

export const UNSECURE_KEYS_STORAGE = [
  "@theme",
  "@API_URL",
  "@pendingTasks",
  "@webSocketURL",
  "@notifications",
  "@hasAdminAccess",
  "@languageKeyStorage",
  "@clipboardWebSocketURL",
] as const;

export type SECURE_KEYS_STORAGE_TYPE = (typeof SECURE_KEYS_STORAGE)[number];
export type UNSECURE_KEYS_STORAGE_TYPE = (typeof UNSECURE_KEYS_STORAGE)[number];

export const ALL_KEYS_STORAGE: (
  | SECURE_KEYS_STORAGE_TYPE
  | UNSECURE_KEYS_STORAGE_TYPE
)[] = [...SECURE_KEYS_STORAGE, ...UNSECURE_KEYS_STORAGE];

export type ALL_KEYS_STORAGE_TYPE =
  | SECURE_KEYS_STORAGE_TYPE
  | UNSECURE_KEYS_STORAGE_TYPE;

export type KeyStorageValues<
  T extends "SECURE" | "UNSECURE" | "ALL" = "SECURE",
> = T extends "SECURE"
  ? SECURE_KEYS_STORAGE_TYPE
  : T extends "UNSECURE"
    ? UNSECURE_KEYS_STORAGE_TYPE
    : ALL_KEYS_STORAGE_TYPE;
