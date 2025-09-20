import {
  Cryptos,
  Streamer,
  UserData,
  Notifications,
  LanguagesSupported,
} from "@types";
import { SerializableTask } from "../taskRegistry";

export const SECURE_KEYS_STORAGE = [
  "_userData",
  "_deviceId",
  "_Streamers",
  "_sessionExpiry",
  "_selectedCryptos",
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
  "_userSessionTokenStorage",
] as const;

export type ALL_KEYS_STORAGE_TYPE =
  | SECURE_KEYS_STORAGE_TYPE
  | UNSECURE_KEYS_STORAGE_TYPE;

export type KeyStorageValues<T extends "SECURE" | "UNSECURE" = "SECURE"> =
  T extends "SECURE" ? SECURE_KEYS_STORAGE_TYPE : UNSECURE_KEYS_STORAGE_TYPE;

export type SelectedCryptos = Record<string, Cryptos>;

export type ExpectedSecureStorageTypes = {
  _deviceId: string;
  _userData: Omit<UserData, "password"> | null;
  _Streamers: (Streamer & { isLive: boolean })[] | null;
  _sessionExpiry: number | -1;
  _selectedCryptos: SelectedCryptos | null;
  _userSessionTokenStorage: string | null;
};

export type ExpectedUnsecureStorageTypes = {
  "@theme": "light" | "dark" | "auto";
  "@API_URL": string | null;
  "@pendingTasks": SerializableTask[] | null;
  "@webSocketURL": string | null;
  "@notifications": Notifications;
  "@hasAdminAccess": boolean | null;
  "@languageKeyStorage": LanguagesSupported;
};

export type ExpectedStorageTypes<
  T extends "SECURE" | "UNSECURE" | "BOTH" = "SECURE",
> = T extends "BOTH"
  ? ExpectedSecureStorageTypes & ExpectedUnsecureStorageTypes
  : T extends "SECURE"
    ? ExpectedSecureStorageTypes
    : ExpectedUnsecureStorageTypes;
//   {
//   "@theme": "light" | "dark" | "auto";
//   "@API_URL": string | null;
//   "@pendingTasks": SerializableTask[] | null;
//   "@webSocketURL": string | null;
//   "@notifications": Notifications;
//   "@hasAdminAccess": boolean | null;
//   "@languageKeyStorage": LanguagesSupported;
//   _deviceId: string;
//   _userData: Omit<UserData, "password"> | null;
//   _Streamers: (Streamer & { isLive: boolean })[] | null;
//   _sessionExpiry: number | -1;
//   _selectedCryptos: SelectedCryptos | null;
//   _userSessionTokenStorage: string | null;
// };
