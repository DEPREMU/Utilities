import { Theme } from "@types";
import { useColors } from "@hooks/useColors";
import { StatusBar } from "react-native";
import { PaperProvider } from "react-native-paper";
import { loadData, saveData } from "@utils";
import React, { createContext, useContext, useEffect, useState } from "react";

interface ThemeProviderProps {
  children: React.ReactNode;
}

type ThemeContextType = ReturnType<typeof useColors> & {
  themeState: Theme;
  setThemeState: React.Dispatch<React.SetStateAction<Theme>>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeState, setThemeState] = useState<Theme>("auto");

  useEffect(() => {
    loadData("@theme").then((data) => {
      setThemeState(data || "auto");
    });
  }, []);

  useEffect(() => {
    saveData("@theme", themeState);
  }, [themeState]);

  const colors = useColors(themeState);

  const { paperTheme, isLight } = colors;

  return (
    <ThemeContext.Provider value={{ setThemeState, ...colors, themeState }}>
      <PaperProvider theme={paperTheme}>
        <StatusBar
          barStyle={isLight ? "light-content" : "dark-content"}
          backgroundColor={paperTheme.colors.background}
        />
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeProvider;
