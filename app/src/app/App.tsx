import {
  logger,
  tTyped,
  openURL,
  REPLACERS,
  APP_VERSION,
  fetchToServer,
  storageManagement,
  setTimeoutPolyfill,
  fetchAndApplyUpdate,
  setIntervalPolyfill,
  isNewUpdateAvailable,
  clearIntervalPolyfill,
  configureNotificationChannel,
} from "@utils";
import { Alert } from "react-native";
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

      return new Promise<void>((resolve) => {
        Alert.alert(
          tTyped("updateAvailable"),
          tTyped("updateAvailableMessage"),
          [
            {
              text: tTyped("labels.cancel"),
              style: "cancel",
              onPress: () => resolve(),
            },
            {
              text: tTyped("updateNow"),
              onPress: () => {
                openURL(result.downloadUrl);
                resolve();
              },
            },
          ],
        );
      });
    } catch (error) {
      logger.error("Error while updating the app", error);
    }
  });

  const handleCheckForUpdatesRef = useRef(async () => {
    try {
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
      while (!storageManagement.isLoaded) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      setIsLoading(false);
    };
    initializeApp();

    if (REPLACERS.isWeb) return;

    if (!REPLACERS.isDev)
      setTimeoutPolyfill(
        () =>
          NativeFunctionsModule.wasLaunchedFromService().then(
            (launchedFromService) =>
              launchedFromService && NativeFunctionsModule.minimizeApp(),
          ),
        500,
      );

    handleCheckForUpdatesRef.current();
    const id = setIntervalPolyfill(
      () => handleCheckForUpdatesRef.current(),
      8 * 60 * 60 * 1000,
    );

    return () => clearIntervalPolyfill(id);
  }, []);

  if (isLoading) return null;

  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
};

export default App;
