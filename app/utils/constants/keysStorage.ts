export const SECURE_KEYS_STORAGE = [
  "_userData",
  "_deviceId",
  "_Streamers",
  "_sessionExpiry",
  "_selectedCryptos",
  "_lastUpdateCheck",
  "_downDetectorData",
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
)[] = [
  "@theme",
  "@API_URL",
  "@pendingTasks",
  "@webSocketURL",
  "@notifications",
  "@hasAdminAccess",
  "@languageKeyStorage",
  "_userData",
  "_deviceId",
  "_Streamers",
  "_sessionExpiry",
  "_selectedCryptos",
  "_lastUpdateCheck",
  "_userSessionTokenStorage",
] as const;

export type ALL_KEYS_STORAGE_TYPE =
  | SECURE_KEYS_STORAGE_TYPE
  | UNSECURE_KEYS_STORAGE_TYPE;

export type KeyStorageValues<T extends "SECURE" | "UNSECURE" = "SECURE"> =
  T extends "SECURE" ? SECURE_KEYS_STORAGE_TYPE : UNSECURE_KEYS_STORAGE_TYPE;
