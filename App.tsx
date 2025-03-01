import Home from "./screens/Home";
import React from "react";
import IPScreen from "./screens/connectivity/IPScreen";
import { DarkMode } from "./utils/globalVariables/DarkMode";
import { LightMode } from "./utils/globalVariables/LightMode";
import { LayoutProvider } from "./components/context/LayoutContext";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { LogBox, useColorScheme } from "react-native";
import {
  MD3Theme,
  PaperProvider,
  adaptNavigationTheme,
} from "react-native-paper";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
LogBox.ignoreAllLogs(false);

const fontsNavigation = {
  fonts: {
    regular: {
      fontFamily: "Roboto",
      fontWeight: "400" as "400",
    },
    medium: {
      fontFamily: "Roboto",
      fontWeight: "500" as "500",
    },
    bold: {
      fontFamily: "Roboto",
      fontWeight: "700" as "700",
    },
    heavy: {
      fontFamily: "Roboto",
      fontWeight: "700" as "700",
    },
  },
};

export default function App() {
  const Stack = createNativeStackNavigator();
  const isDarkMode = useColorScheme() == "dark";
  const theme: MD3Theme = isDarkMode ? DarkMode : LightMode;
  const { LightTheme: Light, DarkTheme: Dark } = adaptNavigationTheme({
    reactNavigationDark: DarkTheme,
    reactNavigationLight: DefaultTheme,
  });

  const themeNavigation = isDarkMode
    ? { ...Dark, fonts: fontsNavigation.fonts }
    : { ...Light, fonts: fontsNavigation.fonts };

  return (
    <LayoutProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          backgroundColor={theme.colors.background} // Ajusta el color al fondo del tema
          style={isDarkMode ? "light" : "dark"} // Cambia el color de los iconos según el modo
          
        />
        <NavigationContainer theme={themeNavigation}>
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={Home}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="IPScreen"
              component={IPScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </LayoutProvider>
  );
}
