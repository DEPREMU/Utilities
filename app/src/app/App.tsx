import {
  debug,
  alerts,
  logger,
  openURL,
  REPLACERS,
  deviceInfo,
  APP_VERSION,
  fetchToServer,
  sessionManager,
  recorderManager,
  clipboardManager,
  storageManagement,
  setTimeoutPolyfill,
  fetchAndApplyUpdate,
  setIntervalPolyfill,
  isNewUpdateAvailable,
  notificationsManager,
  clearIntervalPolyfill,
  configureNotificationChannel,
  updates,
} from "@utils";
import AppNavigator from "./AppNavigator";
import AppProviders from "@context/AppProviders";
import { NativeFunctionsModule } from "@modules";
import React, { useEffect, useRef } from "react";

configureNotificationChannel();

const App = () => {
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const handleCheckForUpdatesNativelyRef = useRef(async () => {
    try {
      if (APP_VERSION.includes("dev")) return; // Skip updates for testing builds

      const res = await fetchToServer("/is-update-available", {
        buildType: "android",
        currentVersion: APP_VERSION,
        platformOS: undefined,
      });
      const result = res.data;

      if (!result?.updateAvailable) return;

      return await alerts.showAlert(
        "updateAvailable",
        "updateAvailableMessage",
        async (_, accepted) => {
          if (!accepted) return;

          openURL(result.downloadUrl);
        },
      );
    } catch (error) {
      logger.error("Error while updating the app", error);
    }
  });

  const handleCheckForUpdatesRef = useRef(async () => {
    try {
      if (APP_VERSION.includes("dev")) return; // Skip updates for testing builds

      await handleCheckForUpdatesNativelyRef.current();
      storageManagement.save("LAST_UPDATE_CHECK", Date.now());

      const isAvailable = await isNewUpdateAvailable();
      if (!isAvailable) return;

      await fetchAndApplyUpdate();
    } catch (error) {
      logger.error("Error while updating the app", error);
    } finally {
      setIsLoading(false);
    }
  });

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
      clipboardManager.cleanup();
      debug?.cleanup();
      deviceInfo.cleanup();
      sessionManager.cleanup();
      recorderManager.cleanup();
      updates?.cleanup();

      fun?.();
    };

    if (REPLACERS.isWeb) return cleanup();

    if (!REPLACERS.isDev)
      setTimeoutPolyfill(async () => {
        const launchedFromService =
          await NativeFunctionsModule.wasLaunchedFromService();
        if (!launchedFromService) return;

        await handleCheckForUpdatesNativelyRef.current();
      }, 500);
    else return cleanup();

    handleCheckForUpdatesRef.current();
    const id = setIntervalPolyfill(
      () => handleCheckForUpdatesRef.current(),
      8 * 60 * 60 * 1000,
    );

    return cleanup(() => clearIntervalPolyfill(id));
  }, []);

  if (isLoading) return null;

  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
};

export default App;
