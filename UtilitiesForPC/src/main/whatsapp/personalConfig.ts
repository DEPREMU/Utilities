import path from "path";
import { app } from "electron";
import { Helper, File } from "@common";
import { PersonalStickerConfig } from "@types";
import { getStorageValue, saveStorageValue } from "@utils";

export const DEFAULT_PERSONAL_CONFIG: PersonalStickerConfig = {
  emojis: ["✨"],
  quality: 80,
  packName: "Utilities",
  authorName: "Utilities App",
  allowedChats: "direct_only",
  enabledAutoReply: true,
  autoConnect: false,
};

let cachedConfig: PersonalStickerConfig = { ...DEFAULT_PERSONAL_CONFIG };

const migrateLegacyConfig = async (): Promise<PersonalStickerConfig | null> => {
  try {
    const legacyPath = path.join(
      app.getPath("userData"),
      "whatsapp-config.json",
    );
    const legacyFile = new File(legacyPath);
    if (!(await legacyFile.exists())) return null;

    const content = await legacyFile.readFile("utf-8");
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      "whatsapp-personal-config"?: PersonalStickerConfig;
    };
    const legacyConfig = parsed?.["whatsapp-personal-config"];
    if (legacyConfig) {
      const merged: PersonalStickerConfig = {
        ...DEFAULT_PERSONAL_CONFIG,
        ...legacyConfig,
      };
      await saveStorageValue(
        "WHATSAPP_CONFIG",
        Helper.JSON.stringifyData(merged),
      );
      await legacyFile.rm({ force: true });
      return merged;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Retrieves the persisted personal sticker configuration from secure storage.
 *
 * @returns Promise resolving to current sticker preferences
 */
export const getPersonalStickerConfig =
  async (): Promise<PersonalStickerConfig> => {
    try {
      const stored = await getStorageValue("WHATSAPP_CONFIG");
      if (stored) {
        const parsed = Helper.JSON.parseData<PersonalStickerConfig>(stored);
        if (parsed) {
          cachedConfig = {
            ...DEFAULT_PERSONAL_CONFIG,
            ...parsed,
          };
          return { ...cachedConfig };
        }
      }

      const migrated = await migrateLegacyConfig();
      if (migrated) {
        cachedConfig = migrated;
        return { ...cachedConfig };
      }
    } catch {
      return { ...cachedConfig };
    }

    return { ...cachedConfig };
  };

/**
 * Updates personal sticker preferences and persists them to secure storage.
 *
 * @param patch - Partial configuration updates
 * @returns Promise resolving to updated personal sticker configuration
 */
export const updatePersonalStickerConfig = async (
  patch: Partial<PersonalStickerConfig>,
): Promise<PersonalStickerConfig> => {
  const current = await getPersonalStickerConfig();
  const updated: PersonalStickerConfig = {
    ...current,
    ...patch,
  };

  cachedConfig = { ...updated };

  try {
    await saveStorageValue(
      "WHATSAPP_CONFIG",
      Helper.JSON.stringifyData(updated),
    );
  } catch {
    return updated;
  }

  return updated;
};
