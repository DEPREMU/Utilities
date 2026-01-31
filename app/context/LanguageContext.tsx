import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  ReactNode,
  useContext,
  useCallback,
  createContext,
} from "react";
import { useTranslation } from "react-i18next";
import { i18n, REPLACERS } from "@utils";
import { LanguagesSupported, typeT } from "@types";
import { checkLanguage, storageManagement } from "@utils";

interface LanguageContextProps {
  language: LanguagesSupported;
  changeLanguageRef: React.RefObject<
    (lang: LanguagesSupported) => Promise<void>
  >;
  t: typeT;
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

  const t: typeT = useCallback(
    (key, ...args) => {
      const translation = i18nextT(key, ...(args as []));

      if (REPLACERS.isDev && translation === key)
        throw new Error(`Missing translation for key: "${key}"`);

      return translation;
    },
    [i18nextT],
  );

  const changeLanguageRef = useRef(async (lang: LanguagesSupported) => {
    setLanguage(lang);
    storageManagement.save("LANGUAGE", lang);
    await i18n.changeLanguage(lang);
  });

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await checkLanguage();
      setLanguage(storedLang);
      await i18n.changeLanguage(storedLang);
    };

    loadLanguage();
  }, []);

  const value: LanguageContextProps = useMemo(
    () => ({
      t,
      language,
      changeLanguageRef,
    }),
    [language, t],
  );

  return (
    <LanguageContext.Provider value={value}>
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
