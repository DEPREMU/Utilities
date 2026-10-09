import {
  useMemo,
  ReactNode,
  useContext,
  useCallback,
  createContext,
} from "react";
import { REPLACERS } from "@REPLACERS";
import { useTranslation } from "react-i18next";
import { FrontendTranslations, typeT } from "@types";

type typeTFrontend = typeT<FrontendTranslations>;

type ContextProps = {
  t: typeTFrontend;
};

const TranslationsContext = createContext<ContextProps>(undefined as never);

export const TranslationsProvider = ({ children }: { children: ReactNode }) => {
  const { t: i18nextT } = useTranslation();

  /**
   * This function allows to use translations with dynamic support, if key has replacers, it will automatically throw an error if the replacers are not provided, and it will also throw an error in development mode if a translation key is missing.
   * @usage
   * ```
   * t("key_with_replacer{{value}}"); // ts-error: It expected two arguments, but only one is given.
   * t("key_with_replacer{{value}}", {}); // ts-error: The property "value" is missing in the type '{}'
   * t("key_with_replacer{{value}}", { value: "someValue" }); // This is the correct way to use the translation function.
   * ```
   */
  const t: typeT = useCallback(
    (key, ...args) => {
      const translation = i18nextT(
        key,
        ...((args.length === 0 ? [{ returnObjects: true }] : args) as never),
      );

      if (REPLACERS.isDev && translation === key)
        throw new Error(`Missing translation for key: "${key}"`);

      return translation as never;
    },
    [i18nextT],
  );

  const value = useMemo<ContextProps>(() => ({ t }), [t]);

  return (
    <TranslationsContext.Provider value={value}>
      {children}
    </TranslationsContext.Provider>
  );
};

export const useTranslations = (): ContextProps => {
  const context = useContext(TranslationsContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
