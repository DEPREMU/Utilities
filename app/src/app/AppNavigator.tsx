/* eslint-disable @typescript-eslint/no-require-imports */
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import Network from "@screens/Network/screens";
import Translator from "@screens/Translator/screens/Translator";
import HomeScreen from "@screens/Home/screens/HomeScreen";
import ScanQRCode from "@screens/Auth/screens/ScanQRCode";
import QRNavigator from "@screens/QR/screens";
import LoginScreen from "@screens/Auth/screens/LoginScreen";
import Minesweeper from "@screens/Games/Minesweeper/screens/Minesweeper";
import * as Linking from "expo-linking";
import PDFNavigator from "@screens/PDF/screens";
import SignUpScreen from "@screens/Auth/screens/SignUpScreen";
import GamesNavigator from "@screens/Games/screens";
import VaultNavigator from "@screens/Vault/screens";
import SettingsScreen from "@screens/Settings/screens";
import MarkdownViewer from "@screens/Markdown/screens/MarkdownViewer";
import ImagesNavigator from "@screens/Images/screens";
import ComputerControl from "@screens/Phone/ComputesControl/screens";
import CryptosNavigator from "@screens/Cryptos/screens";
import TerminalCommands from "@screens/Web/TerminalCommands/screens";
import RecorderNavigator from "@screens/Phone/Recorder/screens";
import DeviceInformation from "@screens/DeviceInformation/screens";
import { useAppBehavior } from "@context/AppBehaviorContext";
import ClipboardNavigator from "@screens/Clipboard/screens";
import CalculatorNavigator from "@screens/Calculator/screens";
import React, { useEffect } from "react";
import SocialMediaNavigator from "@screens/SocialMedia/screens";
import ForgotPasswordScreen from "@screens/Auth/screens/ForgotPasswordScreen";
import DownDetectorNavigator from "@screens/DownDetector/screens";
import { NavigationContainer } from "@react-navigation/native";
import { Screens as RootStackParamList, ScreensAvailable } from "@types";
import { REPLACERS, navigation, setupNotificationHandlers } from "@utils";

type Screens = {
  [K in ScreensAvailable]: {
    component: React.FC<RootStackParamList[K]>;
    options?: NativeStackNavigationOptions;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const ComponentToHome: React.FC = () => {
  useEffect(() => {
    navigation.replace("Home");
  }, []);
  return null;
};

/**
 * Centralized configuration object for all app screens.
 * This improves maintainability and scalability by allowing easy management of screen components and their options.
 * Add new screens or modify existing ones here to keep navigation logic clean and organized.
 */
const screens: Screens = {
  Home: { component: HomeScreen },
  Login: { component: LoginScreen },
  Games: { component: GamesNavigator },
  SignUp: { component: SignUpScreen },
  Network: { component: Network },
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
  Test: {
    component: REPLACERS.isDev
      ? require("@screens/test/ButtonTest").default
      : ComponentToHome,
  },
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
  PDF: { component: PDFNavigator },
  QR: {
    component: QRNavigator,
  },
  Notes: {
    component: REPLACERS.isWeb
      ? ComponentToHome
      : require("@screens/Notes/screens").default,
    //? Temporary fix to prevent web crashes due to incompatible dependencies (expo-sqlite)..
  },
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
  const { navigationTheme } = useAppBehavior();

  useEffect(() => {
    if (REPLACERS.isNative) {
      const handleNavigate = async (url: string | null) => {
        if (!url || (!url.startsWith("content") && !url.startsWith("file")))
          return;

        if (url.endsWith(".pdf")) {
          try {
            const { default: BlobUtil } =
              await import("react-native-blob-util");

            const uri = `${BlobUtil.fs.dirs.CacheDir}/${url.split("/").pop()}`;

            await BlobUtil.fs.cp(
              url,
              `${BlobUtil.fs.dirs.CacheDir}/${url.split("/").pop()}`,
            );

            navigation.replace("PDF", { uri });
          } catch (error) {
            REPLACERS.Logger.error(
              "Error handling PDF URL:",
              error instanceof Error ? error.message : String(error),
            );
          }
        }
      };

      const sub = Linking.addEventListener("url", ({ url }) => {
        handleNavigate(url);
      });
      const notificationsListeners = setupNotificationHandlers();

      Linking.getInitialURL().then(handleNavigate);

      return () => {
        sub.remove();
        notificationsListeners.remove();
      };
    }

    const func = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      switch (key) {
        case "h":
          if (event.ctrlKey) {
            event.preventDefault();
            navigation.replace("Home");
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
    <NavigationContainer ref={navigation.ref} theme={navigationTheme}>
      <Stack.Navigator initialRouteName={navigation.currentScreen}>
        {allScreens}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
