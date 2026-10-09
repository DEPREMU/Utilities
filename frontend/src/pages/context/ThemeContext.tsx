import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import i18n from "i18next";

export type Theme = "dark" | "light";
export type Language = "en" | "es";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  toggleLanguage: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>("dark");
  const [language, setLanguage] = useState<Language>("en");

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const newTheme: Theme = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
      return newTheme;
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const newLang = prev === "en" ? "es" : "en";
      i18n.changeLanguage(newLang);
      return newLang;
    });
  }, []);

  useEffect(() => {
    const storedTheme: Theme = (localStorage.getItem("theme") as Theme) === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", storedTheme);
    setTheme(storedTheme);
    
    const initialLang = i18n.language?.startsWith("es") ? "es" : "en";
    setLanguage(initialLang);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, language, toggleLanguage }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
