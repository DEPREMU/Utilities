import { PaperProvider } from "react-native-paper";
import { LayoutProvider } from "./context/LayoutContext";
import { useThemeContext } from "./context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import Navigation from "./Navigation";
import { useMemo } from "react";

const ThemeChildren = () => {
  const { theme, themeNavigation, isDarkMode } = useThemeContext();

  return (
    <LayoutProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          backgroundColor={theme.colors.background} //? Ajusta el color al fondo del tema
          style={isDarkMode ? "light" : "dark"} //? Cambia el color de los iconos según el modo
        />
        <Navigation themeNavigation={themeNavigation} />
      </PaperProvider>
    </LayoutProvider>
  );
};

export default ThemeChildren;
