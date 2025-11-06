import { app } from "electron";
import dataApp from "./variables";
import { LanguagesSupported } from "@types";

type Translations = {
  show: string;
  exit: string;
  trayTooltip: string;
};

/**
 * Gets the current language setting based on the application locale.
 *
 * @returns The supported language code. Returns "es" for Spanish locales
 * (any locale starting with "es"), otherwise returns "en" for English.
 */
export const getLanguage = (): LanguagesSupported => {
  const lang = app.getLocale();
  if (lang.startsWith("es")) return "es";
  return "en";
};

const translations: Record<LanguagesSupported, Translations> = {
  en: { show: "Show", exit: "Exit", trayTooltip: "Utilities for PC" },
  es: { show: "Mostrar", exit: "Salir", trayTooltip: "Utilidades para PC" },
};

/**
 * Retrieves a translated string for the given key based on the current language.
 *
 * @param key - The translation key to look up from the Translations interface
 * @returns The translated string for the current language, or the key itself if translation is not found
 *
 * @example
 * ```typescript
 * const showText = t('show'); // Returns "Show" for English or "Mostrar" for Spanish
 * ```
 */
export const t = (
  key: keyof Translations,
  replace: Record<string, unknown> = {}
): string => {
  const value = translations[dataApp.getValue("language")]?.[key] || key;
  let translated = value;
  for (const [placeholder, replacement] of Object.entries(replace)) {
    translated = translated.replace(
      new RegExp(`{{${placeholder}}}`, "g"),
      String(replacement)
    );
  }
  return translated;
};
