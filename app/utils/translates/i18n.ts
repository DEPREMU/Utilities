import i18n from "i18next";
import { typeT } from "@types";
import { enApp, esApp } from "@common";
import { initReactI18next } from "react-i18next";
import { logger, checkLanguage } from "../functions";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: enApp },
    es: { translation: esApp },
  },
  interpolation: {
    escapeValue: false,
  },
});

const configureLanguage = async () => {
  try {
    const lng = await checkLanguage();

    await i18n.changeLanguage(lng);
  } catch (error) {
    logger.error?.("Error configuring language:", error);
    await i18n.changeLanguage("en");
  }
};
configureLanguage();

export const tTyped = i18n.t as typeT;

export { i18n };
