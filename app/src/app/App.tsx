import {
  REPLACERS,
  deviceInfo,
  sessionManager,
  cleanupServices,
  recorderManager,
  clipboardManager,
  storageManagement,
  setTimeoutPolyfill,
  notificationsManager,
  configureNotificationChannel,
} from "@utils";
import AppNavigator from "./AppNavigator";
import AppProviders from "@context/AppProviders";
import React, { useEffect } from "react";
import { NativeFunctionsModule } from "@modules";

configureNotificationChannel();

const App = () => {
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  useEffect(() => {
    const initializeApp = async () => {
      storageManagement.setHasUI();
      await Promise.all([
        deviceInfo.waitUntilLoaded(),
        sessionManager.waitUntilLoaded(),
        recorderManager.waitUntilLoaded(),
        clipboardManager.waitUntilLoaded(),
        storageManagement.waitUntilLoaded(),
        notificationsManager.waitUntilLoaded(),
      ]);

      setIsLoading(false);
    };
    initializeApp();

    const cleanup = (fun?: () => void) => () => {
      cleanupServices();

      fun?.();
    };

    if (REPLACERS.isWeb) return cleanup();

    if (!REPLACERS.isDev)
      setTimeoutPolyfill(async () => {
        const launchedFromService =
          await NativeFunctionsModule.wasLaunchedFromService();
        if (!launchedFromService) return;

        NativeFunctionsModule.minimizeApp();
      }, 500);

    return cleanup();
  }, []);

  if (isLoading) return null;

  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
};

export default App;
