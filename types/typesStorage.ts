import type { Session } from "../app/node_modules/@supabase/supabase-js";

export type StorageKeys = "selectedCryptos" | "userPreferences";

export type SessionStored = Omit<Session, "user">;

export type Theme = "light" | "dark" | "auto";
