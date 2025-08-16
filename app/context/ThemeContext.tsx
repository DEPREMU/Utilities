import React from "react";
import { PaperProvider } from "react-native-paper";
import { useColors } from "@/hooks/useColors";

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { paperTheme } = useColors();

  return <PaperProvider theme={paperTheme}>{children}</PaperProvider>;
};

export default ThemeProvider;
