import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { enFrontend, esFrontend } from "@common";
import type { FrontendTranslations, typeT } from "@types";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: enFrontend },
    es: { translation: esFrontend },
  },
  interpolation: { escapeValue: true },
});

export const t = i18n.t as typeT<FrontendTranslations>;
