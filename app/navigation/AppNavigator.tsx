import {
  NativeStackNavigationProp,
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import InfoIP from "@screens/Connectivity/IP";
import HomeScreen from "@screens/HomeScreen";
import LoginScreen from "@screens/auth/LoginScreen";
import Minesweeper from "@screens/Games/Minesweeper";
import SignUpScreen from "@screens/auth/SignUpScreen";
import { useTheme } from "@context/ThemeContext";
import GamesNavigator from "@screens/Games";
import SettingsScreen from "@screens/Settings";
import CryptosNavigator from "@screens/Cryptos";
import CalculatorNavigator from "@screens/calculator";
import React, { useEffect } from "react";
import { ScreensAvailable } from "@types";
import { BackgroundTaskProvider } from "@context/BackgroundTaskContext";
import { navigate, navigationRef } from "./navigationRef";
import { setupNotificationHandlers } from "@utils";
import { NavigationContainer, RouteProp } from "@react-navigation/native";

export type RootStackParamList = Record<ScreensAvailable, Object | undefined>;

const Stack = createNativeStackNavigator<RootStackParamList>();

type Screens = Record<
  keyof RootStackParamList,
  {
    component: React.ComponentType<{
      route: RouteProp<RootStackParamList>;
      navigation: NativeStackNavigationProp<RootStackParamList>;
    }>;
    options?:
      | NativeStackNavigationOptions
      | ((props: {
          route: RouteProp<RootStackParamList>;
          navigation: NativeStackNavigationProp<RootStackParamList>;
          theme: ReactNavigation.Theme;
        }) => NativeStackNavigationOptions);
  }
>;

/**
 * Centralized configuration object for all app screens.
 * This improves maintainability and scalability by allowing easy management of screen components and their options.
 * Add new screens or modify existing ones here to keep navigation logic clean and organized.
 */
const screens: Screens = {
  Home: { component: HomeScreen },
  Cryptos: { component: CryptosNavigator },
  InfoIP: { component: InfoIP },
  Login: { component: LoginScreen },
  SignUp: { component: SignUpScreen },
  Settings: { component: SettingsScreen },
  Calculator: { component: CalculatorNavigator },
  Minesweeper: { component: Minesweeper },
  Games: { component: GamesNavigator },
};

const allScreens = Object.entries(screens).map(
  ([name, { component, options }]) => (
    <Stack.Screen
      key={name}
      name={name as keyof RootStackParamList}
      component={component}
      options={
        (options as NativeStackNavigationOptions) ?? {
          headerShown: false,
        }
      }
    />
  ),
);

const AppNavigator: React.FC = () => {
  const { navigationTheme } = useTheme();

  useEffect(() => {
    const cleanup = setupNotificationHandlers(navigate);

    return cleanup;
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <BackgroundTaskProvider>
        <Stack.Navigator initialRouteName="Home">{allScreens}</Stack.Navigator>
      </BackgroundTaskProvider>
    </NavigationContainer>
  );
};

export default AppNavigator;
