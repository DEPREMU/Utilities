import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import Test from "@screens/ButtonTest";
import InfoIP from "@screens/Connectivity/IP";
import Translator from "@screens/translator/Translator";
import HomeScreen from "@screens/HomeScreen";
import ScanQRCode from "@screens/auth/ScanQRCode";
import LoginScreen from "@screens/auth/LoginScreen";
import Minesweeper from "@screens/Games/Minesweeper";
import * as Linking from "expo-linking";
import PDFNavigator from "@screens/PDF";
import { useTheme } from "@context/ThemeContext";
import SignUpScreen from "@screens/auth/SignUpScreen";
import VaultNavigator from "@screens/Vault";
import GamesNavigator from "@screens/Games";
import SettingsScreen from "@screens/Settings";
import MarkdownViewer from "@screens/markdown/MarkdownViewer";
import ImagesNavigator from "@screens/Images";
import ComputerControl from "@screens/phone/ComputerControl";
import CryptosNavigator from "@screens/Cryptos";
import TerminalCommands from "@screens/Web/TerminalCommands";
import RecorderNavigator from "@screens/phone/Recorder";
import DeviceInformation from "@screens/DeviceInformation/DeviceInfomation";
import ClipboardNavigator from "@screens/Clipboard";
import CalculatorNavigator from "@screens/calculator";
import React, { useEffect } from "react";
import { ScreensAvailable } from "@types";
import SocialMediaNavigator from "@screens/SocialMedia";
import ForgotPasswordScreen from "@screens/auth/ForgotPasswordScreen";
import DownDetectorNavigator from "@screens/DownDetector";
import { NavigationContainer } from "@react-navigation/native";
import { BackgroundTaskProvider } from "@context/BackgroundTaskContext";
import { navigateReplace, navigationRef } from "./navigationRef";
import { REPLACERS, setupNotificationHandlers } from "@utils";

export type RootStackParamList = Record<ScreensAvailable, object | undefined>;

const Stack = createNativeStackNavigator<RootStackParamList>();

type Screens = Record<
  keyof RootStackParamList,
  {
    component: React.FC;
    options?: NativeStackNavigationOptions;
  }
>;

const ComponentToHome: React.FC = () => {
  useEffect(() => {
    navigateReplace("Home");
  }, []);
  return null;
};

const initialRouteName: ScreensAvailable = REPLACERS.isDev ? "PDF" : "Home";

/**
 * Centralized configuration object for all app screens.
 * This improves maintainability and scalability by allowing easy management of screen components and their options.
 * Add new screens or modify existing ones here to keep navigation logic clean and organized.
 */
const screens: Screens = {
  Home: { component: HomeScreen },
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
  DeviceInformation: { component: DeviceInformation },
  Vault: { component: VaultNavigator },
  Test: { component: REPLACERS.isDev ? Test : ComponentToHome },
  Recorder: {
    component: REPLACERS.isWeb ? ComponentToHome : RecorderNavigator,
  },
  Images: { component: ImagesNavigator },
  ScanQRCode: {
    component: REPLACERS.isWeb ? ComponentToHome : ScanQRCode,
  },
  ComputerControl: {
    component: REPLACERS.isWeb ? ComponentToHome : ComputerControl,
  },
  TerminalCommands: {
    component: REPLACERS.isWeb ? TerminalCommands : ComponentToHome,
  },
  PDF: { component: PDFNavigator as React.FC },
};

const allScreens = Object.entries(screens).map(
  ([name, { component, options }]) => (
    <Stack.Screen
      key={name}
      name={name as keyof RootStackParamList}
      component={component}
      options={{
        ...(options || {}),
        headerShown: false,
      }}
    />
  ),
);

const AppNavigator: React.FC = () => {
  const { navigationTheme } = useTheme();

  useEffect(() => {
    if (REPLACERS.isNative) {
      const handleNavigate = (url: string | null) => {
        if (!url || (!url.startsWith("content") && !url.startsWith("file")))
          return;

        navigateReplace("PDF", { uri: decodeURIComponent(url) });
      };

      const sub = Linking.addEventListener("url", ({ url }) => {
        handleNavigate(url);
      });
      const removeNotifications = setupNotificationHandlers();

      Linking.getInitialURL().then((url) => {
        handleNavigate(url);
      });

      return () => {
        sub.remove();
        removeNotifications();
      };
    }

    const func = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      switch (key) {
        case "h":
          if (event.ctrlKey) {
            event.preventDefault();
            navigateReplace("Home");
          }
          break;

        default:
          break;
      }
    };

    window?.addEventListener("keydown", func);
    return () => {
      window?.removeEventListener("keydown", func);
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <BackgroundTaskProvider>
        <Stack.Navigator initialRouteName={initialRouteName}>
          {allScreens}
        </Stack.Navigator>
      </BackgroundTaskProvider>
    </NavigationContainer>
  );
};

export default AppNavigator;
