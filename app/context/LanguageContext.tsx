import React, {
  useState,
  useEffect,
  ReactNode,
  useContext,
  createContext,
  useCallback,
} from "react";
import en from "@/utils/translates/English";
import es from "@/utils/translates/Spanish";
import { i18n } from "@utils";
import { useTranslation } from "react-i18next";
import { checkLanguage, saveData } from "@utils";
import { LanguagesSupported, typeLanguages, typeT } from "@types";

interface LanguageContextProps {
  language: LanguagesSupported;
  changeLanguage: (lang: LanguagesSupported) => Promise<void>;
  t: typeT;
  translations: typeLanguages;
}

interface LanguageProviderProps {
  children: ReactNode;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(
  undefined,
);

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
}) => {
  const [language, setLanguage] = useState<LanguagesSupported>("en");
  const { t: i18nextT } = useTranslation();

  const t = useCallback(i18nextT, [i18nextT]) as typeT;

  const getTranslations = useCallback((): typeLanguages => {
    return language === "es" ? es : en;
  }, [language]);

  const changeLanguage = useCallback(async (lang: LanguagesSupported) => {
    await Promise.all([
      saveData("@languageKeyStorage", lang),
      i18n.changeLanguage(lang),
    ]);
    setLanguage(lang);
  }, []);

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await checkLanguage();
      setLanguage(storedLang);
      await i18n.changeLanguage(storedLang);
    };

    loadLanguage();
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        t,
        language,
        changeLanguage,
        translations: getTranslations(),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextProps => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
