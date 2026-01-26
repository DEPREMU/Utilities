import {
  logger,
  tTyped,
  openURL,
  REPLACERS,
  APP_VERSION,
  getRandomId,
  fetchToServer,
  checkLanguage,
  loadDataStorage,
  saveDataStorage,
  setTimeoutPolyfill,
  fetchAndApplyUpdate,
  setIntervalPolyfill,
  isNewUpdateAvailable,
  clearIntervalPolyfill,
  askAutoStartPermission,
  configureNotificationChannel,
} from "./utils/index";
import { Alert } from "react-native";
import AppProviders from "./context/AppProviders";
import AppNavigator from "./navigation/AppNavigator";
import windowModule from "./utils/modules/WindowModule";
import { reloadAppAsync } from "expo";
import NativeFunctionsModule from "./utils/modules/NativeFunctionsModule";
import React, { useEffect, useRef } from "react";

const hasDeviceId = async (): Promise<boolean> => {
  try {
    const deviceId = await loadDataStorage("DEVICE_ID");
    if (REPLACERS.isWeb && deviceId)
      windowModule.setData(deviceId, await checkLanguage());

    if (deviceId) return true;
    askAutoStartPermission();

    if (REPLACERS.isWeb) {
      const deviceId = getRandomId() + "-" + getRandomId();
      windowModule.setData(deviceId, await checkLanguage());
      await saveDataStorage("DEVICE_ID", deviceId);
    } else {
      let uuid: string | undefined = "";
      try {
        const res = await fetchToServer("/getRandomUUID");

        const result = res.data;
        uuid = result?.uuid;
      } catch (error) {
        logger.error("Error saving device ID:", error);
      }
      if (!uuid)
        uuid = Array.from({ length: 3 }, () => getRandomId()).join("-");

      await saveDataStorage(
        "DEVICE_ID",
        uuid.length > 255 ? uuid.substring(0, 255) : uuid,
      );
    }
    return true;
  } catch {
    return false;
  }
};

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
      saveDataStorage("LAST_UPDATE_CHECK", Date.now());

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
    hasDeviceId().then((exists) => {
      if (exists) return;

      if (REPLACERS.isDev) logger.error("Error setting up device ID:");
      reloadAppAsync();
    });
    if (REPLACERS.isWeb) return setIsLoading(false);

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
