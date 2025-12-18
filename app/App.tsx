import {
  isDev,
  tTyped,
  openURL,
  logError,
  APP_VERSION,
  getRandomId,
  fetchToServer,
  checkLanguage,
  loadDataStorage,
  saveDataStorage,
  fetchAndApplyUpdate,
  setIntervalPolyfill,
  isNewUpdateAvailable,
  clearIntervalPolyfill,
  askAutoStartPermission,
  configureNotificationChannel,
  setTimeoutPolyfill,
} from "@utils";
import AppProviders from "./context/AppProviders";
import AppNavigator from "./navigation/AppNavigator";
import windowModule from "./utils/modules/WindowModule";
import { reloadAppAsync } from "expo";
import { Alert, Platform } from "react-native";
import NativeFunctionsModule from "./utils/modules/NativeFunctionsModule";
import React, { useCallback, useEffect } from "react";

const hasDeviceId = async (): Promise<boolean> => {
  try {
    const deviceId = await loadDataStorage("DEVICE_ID");
    if (Platform.OS === "web" && deviceId)
      windowModule.setData(deviceId, await checkLanguage());

    if (deviceId) return true;
    askAutoStartPermission();

    if (Platform.OS === "web") {
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
        logError("Error saving device ID:", error);
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

  const handleCheckForUpdatesNatively = useCallback(async () => {
    try {
      if (APP_VERSION.startsWith("0.0")) return; // Skip updates for testing builds

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
              text: tTyped("cancel"),
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
      logError("Error while updating the app", error);
    }
  }, []);
  const handleCheckForUpdatesNativelyRef = React.useRef(
    handleCheckForUpdatesNatively,
  );
  useEffect(() => {
    handleCheckForUpdatesNativelyRef.current = handleCheckForUpdatesNatively;
  }, [handleCheckForUpdatesNatively]);

  const handleCheckForUpdates = useCallback(async () => {
    try {
      await handleCheckForUpdatesNativelyRef.current();
      saveDataStorage("LAST_UPDATE_CHECK", Date.now());

      const isAvailable = await isNewUpdateAvailable();
      if (!isAvailable) return;

      await fetchAndApplyUpdate();
    } catch (error) {
      logError("Error while updating the app", error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  const handleCheckForUpdatesRef = React.useRef(handleCheckForUpdates);
  useEffect(() => {
    handleCheckForUpdatesRef.current = handleCheckForUpdates;
  }, [handleCheckForUpdates]);

  useEffect(() => {
    hasDeviceId().then((exists) => {
      if (exists) return;

      if (isDev) logError("Error setting up device ID:");
      reloadAppAsync();
    });
    if (Platform.OS === "web") return setIsLoading(false);

    !isDev &&
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
