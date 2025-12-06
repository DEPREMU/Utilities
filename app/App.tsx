import {
  isDev,
  openURL,
  logError,
  APP_VERSION,
  getRandomId,
  fetchToServer,
  checkLanguage,
  loadDataSecure,
  saveDataSecure,
  fetchAndApplyUpdate,
  setIntervalPolyfill,
  isNewUpdateAvailable,
  clearIntervalPolyfill,
  askAutoStartPermission,
  configureNotificationChannel,
} from "@utils";
import { typeT } from "@types";
import * as Updates from "expo-updates";
import AppProviders from "./context/AppProviders";
import AppNavigator from "./navigation/AppNavigator";
import windowModule from "./utils/modules/WindowModule";
import { t as i18n } from "i18next";
import { Alert, Platform } from "react-native";
import NativeFunctionsModule from "./utils/modules/NativeFunctionsModule";
import React, { useCallback, useEffect } from "react";

const hasDeviceId = async (): Promise<boolean> => {
  try {
    const deviceId = await loadDataSecure("_deviceId");
    if (Platform.OS === "web" && deviceId)
      windowModule.setData(deviceId, await checkLanguage());

    if (deviceId) return true;
    askAutoStartPermission();
    if (Platform.OS === "web") {
      const deviceId = getRandomId() + "-" + getRandomId();
      windowModule.setData(deviceId, await checkLanguage());
      await saveDataSecure("_deviceId", deviceId);
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

      await saveDataSecure(
        "_deviceId",
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
      const res = await fetchToServer("/is-update-available", {
        buildType: "android",
        currentVersion: APP_VERSION,
        platformOS: undefined,
      });
      const result = res.data;

      if (!result?.updateAvailable) return;

      const t = i18n as typeT;

      return new Promise<void>((resolve) => {
        Alert.alert(t("updateAvailable"), t("updateAvailableMessage"), [
          {
            text: t("cancel"),
            style: "cancel",
            onPress: () => resolve(),
          },
          {
            text: t("updateNow"),
            onPress: () => {
              openURL(result.downloadUrl);
              resolve();
            },
          },
        ]);
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
      saveDataSecure("_lastUpdateCheck", Date.now());

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
      try {
        if (!exists) {
          if (process.env.NODE_ENV === "development" || __DEV__)
            logError("Error setting up device ID:");
          else Updates.reloadAsync();
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development" || __DEV__)
          logError("Error setting up device ID:", error);
        else Updates.reloadAsync();
      }
    });
    if (Platform.OS === "web") return setIsLoading(false);

    NativeFunctionsModule.wasLaunchedFromService().then(
      (launchedFromService) =>
        !isDev && launchedFromService && NativeFunctionsModule.minimizeApp(),
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
