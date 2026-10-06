import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { enFrontend, esFrontend } from "@common";
import type { FrontendTranslations, typeT } from "@types";

export const t = (await i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: enFrontend },
    es: { translation: esFrontend },
  },
  interpolation: { escapeValue: true },
})) as typeT<FrontendTranslations>;
