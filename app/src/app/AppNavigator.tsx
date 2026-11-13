import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import {
  Helper,
  Logger,
  Timers,
  REPLACERS,
  navigation,
  ExecuteOnce,
  ScreensConfig,
  storageManagement,
  setupNotificationHandlers,
} from "@utils";
import * as Linking from "expo-linking";
import { useAppBehavior } from "@context/AppBehaviorContext";
import React, { useEffect } from "react";
import { SuspenseComponent } from "@/common/components/SuspenseComponent";
import { NavigationContainer } from "@react-navigation/native";
import { NativeFunctionsModule } from "@/utils/modules";
import { Screens as RootStackParamList, ScreensAvailable } from "@types";

type Screens = {
  [K in ScreensAvailable]: {
    options?: NativeStackNavigationOptions;
    component: () => Promise<{ default: React.FC<RootStackParamList[K]> }>;
  };
};

const logger = new Logger("AppNavigator");

const Stack = createNativeStackNavigator<RootStackParamList>();

const ComponentToHome: React.FC = () => {
  useEffect(() => {
    navigation.replace("Home");
  }, []);
  return null;
};
const ComponentToHomePromise = () =>
  Promise.resolve({
    default: ComponentToHome,
  });

let screens = [] as React.JSX.Element[];

let promise: Promise<void> | null = ExecuteOnce.execute(
  "Init Screens",
  undefined,
  async () => {
    /**
     * Centralized configuration object for all app screens.
     * This improves maintainability and scalability by allowing easy management of screen components and their options.
     * Add new screens or modify existing ones here to keep navigation logic clean and organized.
     */
    const SCREENS: Screens = {
      Home: {
        component: () => import("@screens/Home/screens/HomeScreen"),
      },
      Login: {
        component: () => import("@screens/Auth/screens/LoginScreen"),
      },
      Games: {
        component: () => import("@screens/Games/screens"),
      },
      SignUp: {
        component: () => import("@screens/Auth/screens/SignUpScreen"),
      },
      Network: {
        component: () => import("@screens/Network/screens"),
      },
      Cryptos: {
        component: () => import("@screens/Cryptos/screens"),
      },
      Settings: {
        component: () => import("@screens/Settings/screens"),
      },
      Clipboard: {
        component: () => import("@screens/Clipboard/screens"),
      },
      Translator: {
        component: () => import("@screens/Translator/screens/Translator"),
      },
      Calculator: {
        component: () => import("@screens/Calculator/screens"),
      },
      Minesweeper: {
        component: () =>
          import("@screens/Games/Minesweeper/screens/Minesweeper"),
      },
      SocialMedia: {
        component: () => import("@screens/SocialMedia/screens"),
      },
      DownDetector: {
        component: () => import("@screens/DownDetector/screens"),
      },
      MarkdownViewer: {
        component: () => import("@screens/Markdown/screens/MarkdownViewer"),
      },
      forgotPassword: {
        component: () => import("@screens/Auth/screens/ForgotPasswordScreen"),
      },
      DeviceInformation: {
        component: () => import("@screens/DeviceInformation/screens"),
      },
      Vault: {
        component: () => import("@screens/Vault/screens"),
      },
      Test: {
        component: REPLACERS.isDev
          ? () => import("@screens/test/Test")
          : ComponentToHomePromise,
      },
      Recorder: {
        component: REPLACERS.isWeb
          ? ComponentToHomePromise
          : () => import("@screens/Phone/Recorder/screens"),
      },
      Images: {
        component: () => import("@screens/Images/screens"),
      },
      ScanQRCode: {
        component: REPLACERS.isWeb
          ? ComponentToHomePromise
          : () => import("@screens/Auth/screens/ScanQRCode"),
      },
      ComputerControl: {
        component: REPLACERS.isWeb
          ? ComponentToHomePromise
          : () => import("@screens/Phone/ComputersControl/screens"),
      },
      TerminalCommands: {
        component: !REPLACERS.isWeb
          ? ComponentToHomePromise
          : () => import("@screens/Web/TerminalCommands/screens"),
      },
      PDF: {
        component: () => import("@screens/PDF/screens"),
      },
      QR: {
        component: () => import("@screens/QR/screens"),
      },
      Notes: {
        component: REPLACERS.isWeb
          ? ComponentToHomePromise
          : () => import("@screens/Notes/screens"),
        //? Temporary fix to prevent web crashes due to incompatible dependencies (expo-sqlite)..
      },
      VerifyCode: {
        component: () => import("@screens/Auth/screens/VerifyCodeScreen"),
      },
      ResetPassword: {
        component: () => import("@screens/Auth/screens/ResetPasswordScreen"),
      },
      VerifyResetCode: {
        component: () => import("@screens/Auth/screens/VerifyResetCodeScreen"),
      },
      WhatsAppStickers: {
        component: () =>
          import("@screens/WhatsAppStickers/screens/WhatsAppStickersScreen"),
      },
    };

    await storageManagement.waitUntilInitialized();
    let settings = storageManagement.get("SCREENS_CONFIG");

    if (!settings) {
      settings = Helper.Object.fromEntries(
        Helper.Object.entries(SCREENS).map(([screen]) => {
          if (screen === "Minesweeper") return ["Games", { keepLoaded: false }];

          const def = {
            keepLoaded:
              screen === "Home" ||
              screen === "Login" ||
              (REPLACERS.isDev && screen === navigation.currentScreen),
          } satisfies ScreensConfig[typeof screen];

          return [screen, def] as const;
        }),
      );
      storageManagement.save("SCREENS_CONFIG", settings);
    }

    screens = await Promise.all(
      Helper.Object.entries(SCREENS).map(
        async ([name, { component, options }]) => {
          let Component: React.FC;

          if (name === "Minesweeper") {
            if (settings?.Games.keepLoaded)
              Component = (await component()).default;
            else Component = SuspenseComponent({ load: component });
          } else if (settings?.[name].keepLoaded)
            Component = (await component()).default;
          else Component = SuspenseComponent({ load: component });

          return (
            <Stack.Screen
              key={name}
              name={name as keyof RootStackParamList}
              component={Component}
              options={{
                ...(options || {}),
                headerShown: false,
              }}
            />
          );
        },
      ),
    );
  },
);

let ready = false;
promise.then(() => {
  ready = true;
  promise = null;
});

export const waitForScreensToBeReady = async () => {
  if (ready) return;
  while (!ready) await Timers.sleep(10);
};

const AppNavigator: React.FC = () => {
  const { navigationTheme } = useAppBehavior();

  useEffect(() => {
    if (REPLACERS.isNative) {
      const handleNavigate = async (url: string | null) => {
        logger.log("Handling URL:", url);

        if (!url || (!url.startsWith("content") && !url.startsWith("file")))
          return;

        const metaData = await NativeFunctionsModule.getFileMetadata(url);

        if (metaData.mimeType !== "application/pdf") return;

        try {
          const { default: BlobUtil } = await import("react-native-blob-util");

          const filename = metaData.fileName;
          if (!filename) return;

          const targetUri = `${BlobUtil.fs.dirs.CacheDir}/${filename}`;

          await BlobUtil.fs.cp(url, targetUri);

          navigation.replace("PDF", { uri: targetUri });
        } catch (error) {
          logger.error("Error handling PDF URL:", error);
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
        {screens}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
