import { Cryptos } from "@types";

export const KEYS_STORAGE = [
  "_userSessionStorage",
  "_sessionExpiry",
  "@languageKeyStorage",
  "@notifications",
  "_selectedCryptos",
  "@webSocketURL",
  "@API_URL",
  "@hasAdminAccess",
] as const;

export type KeyStorageValues = (typeof KEYS_STORAGE)[number];

export type SelectedCryptos = Record<string, Cryptos>;
