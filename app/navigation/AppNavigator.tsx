/* eslint-disable @stylistic/indent */
import {
  NativeStackNavigationProp,
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import Test from "@screens/ButtonTest";
import InfoIP from "@screens/Connectivity/IP";
import Translator from "@screens/translator/Translator";
import HomeScreen from "@screens/HomeScreen";
import LoginScreen from "@screens/auth/LoginScreen";
import Minesweeper from "@screens/Games/Minesweeper";
import SignUpScreen from "@screens/auth/SignUpScreen";
import { useTheme } from "@context/ThemeContext";
import GamesNavigator from "@screens/Games";
import SettingsScreen from "@screens/Settings";
import MarkdownViewer from "@screens/markdown/MarkdownViewer";
import ComputerControl from "@/screens/phone/ComputerControl";
import CryptosNavigator from "@screens/Cryptos";
import TerminalCommands from "@screens/Web/TerminalCommands";
import DeviceInformation from "@screens/DeviceInformation/DeviceInfomation";
import ClipboardNavigator from "@screens/Clipboard";
import CalculatorNavigator from "@screens/calculator";
import React, { useEffect } from "react";
import { ScreensAvailable } from "@types";
import SocialMediaNavigator from "@screens/SocialMedia";
import ForgotPasswordScreen from "@screens/auth/ForgotPasswordScreen";
import DownDetectorNavigator from "@screens/DownDetector";
import { BackgroundTaskProvider } from "@context/BackgroundTaskContext";
import { setupNotificationHandlers } from "@utils";
import { navigateReplace, navigationRef } from "./navigationRef";
import { NavigationContainer, RouteProp } from "@react-navigation/native";

export type RootStackParamList = Record<ScreensAvailable, object | undefined>;

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
  Test: { component: Test },
  Login: { component: LoginScreen },
  Games: { component: GamesNavigator },
  InfoIP: { component: InfoIP },
  SignUp: { component: SignUpScreen },
  Cryptos: { component: CryptosNavigator },
  Settings: { component: SettingsScreen },
  Clipboard: { component: ClipboardNavigator },
  Translator: { component: Translator },
  Calculator: { component: CalculatorNavigator },
  Minesweeper: { component: Minesweeper },
  SocialMedia: { component: SocialMediaNavigator },
  DownDetector: { component: DownDetectorNavigator },
  MarkdownViewer: { component: MarkdownViewer },
  forgotPassword: { component: ForgotPasswordScreen },
  ComputerControl: { component: ComputerControl },
  TerminalCommands: { component: TerminalCommands },
  DeviceInformation: { component: DeviceInformation },
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
    const cleanup = setupNotificationHandlers(navigateReplace);

    return cleanup;
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <BackgroundTaskProvider>
        <Stack.Navigator initialRouteName="Home">
          {allScreens}
        </Stack.Navigator>
      </BackgroundTaskProvider>
    </NavigationContainer>
  );
};

export default AppNavigator;
