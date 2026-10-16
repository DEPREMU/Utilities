import Store from "electron-store";
import { app } from "electron";
import { PersonalStickerConfig } from "@types";

export const DEFAULT_PERSONAL_CONFIG: PersonalStickerConfig = {
  emojis: ["✨"],
  quality: 80,
  packName: "Utilities",
  authorName: "Utilities App",
  allowedChats: "direct_only",
  enabledAutoReply: true,
};

let storeInstance: Store<{
  "whatsapp-personal-config": PersonalStickerConfig;
}> | null = null;

const getStore = () => {
  if (!storeInstance) {
    storeInstance = new Store<{
      "whatsapp-personal-config": PersonalStickerConfig;
    }>({
      name: "whatsapp-config",
      cwd: app.getPath("userData"),
      clearInvalidConfig: true,
      defaults: {
        "whatsapp-personal-config": DEFAULT_PERSONAL_CONFIG,
      },
    });
  }
  return storeInstance;
};

/**
 * Retrieves the persisted personal sticker configuration.
 *
 * @returns Copy of current sticker preferences
 */
export const getPersonalStickerConfig = (): PersonalStickerConfig => {
  try {
    const store = getStore();
    return store.get("whatsapp-personal-config", DEFAULT_PERSONAL_CONFIG);
  } catch {
    return { ...DEFAULT_PERSONAL_CONFIG };
  }
};

/**
 * Updates personal sticker preferences and persists them to Electron Store.
 *
 * @param patch - Partial configuration updates
 * @returns Updated personal sticker configuration
 */
export const updatePersonalStickerConfig = (
  patch: Partial<PersonalStickerConfig>,
): PersonalStickerConfig => {
  const current = getPersonalStickerConfig();
  const updated: PersonalStickerConfig = {
    ...current,
    ...patch,
  };

  try {
    const store = getStore();
    store.set("whatsapp-personal-config", updated);
  } catch {
    return updated;
  }

  return updated;
};
