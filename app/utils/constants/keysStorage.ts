import { Cryptos } from "@types";

export const KEYS_STORAGE = [
  "@theme",
  "@API_URL",
  "@pendingTasks",
  "@webSocketURL",
  "@notifications",
  "@hasAdminAccess",
  "@languageKeyStorage",
  "_Streamers",
  "_sessionExpiry",
  "_selectedCryptos",
  "_userSessionStorage",
] as const;

export type KeyStorageValues = (typeof KEYS_STORAGE)[number];

export type SelectedCryptos = Record<string, Cryptos>;
