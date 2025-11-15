import {
  ResponseGetRandomUUID,
  RequestIsUpdateAvailable,
  ResponseIsUpdateAvailable,
  typeT,
} from "@types";
import {
  openURL,
  API_URL,
  logError,
  getRouteAPI,
  fetchOptions,
  checkLanguage,
  loadDataSecure,
  saveDataSecure,
  fetchAndApplyUpdate,
  setIntervalPolyfill,
  isNewUpdateAvailable,
  clearIntervalPolyfill,
  configureNotificationChannel,
} from "@utils";
import chalk from "chalk";
import { v4 } from "uuid";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import AppProviders from "./context/AppProviders";
import AppNavigator from "./navigation/AppNavigator";
import windowModule from "./utils/modules/WindowModule";
import { t as i18n } from "i18next";
import { Alert, Platform } from "react-native";
import React, { useEffect } from "react";

const hasDeviceId = async (): Promise<boolean> => {
  try {
    const deviceId = await loadDataSecure("_deviceId");
    if (Platform.OS === "web" && deviceId)
      windowModule.setData(deviceId, await checkLanguage());

    if (deviceId) return true;
    if (Platform.OS === "web") {
      const deviceId = v4() + v4();
      windowModule.setData(deviceId, await checkLanguage());
      await saveDataSecure("_deviceId", deviceId);
    } else {
      let uuid: string | undefined = "";
      try {
        const res = await fetch(
          await getRouteAPI("/getRandomUUID"),
          fetchOptions("POST"),
        );

        const result = (await res.json()) as ResponseGetRandomUUID;
        uuid = result.uuid;
      } catch (error) {
        logError(chalk.red("Error saving device ID:", error));
      }
      if (!uuid)
        uuid = Array.from({ length: 5 }, () =>
          Math.random().toString(36).substring(2, 15),
        ).join(".");

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

  useEffect(() => {
    hasDeviceId().then((exists) => {
      try {
        if (!exists) {
          if (process.env.NODE_ENV === "development" || __DEV__)
            logError(chalk.red("Error setting up device ID:"));
          else Updates.reloadAsync();
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development" || __DEV__)
          logError(chalk.red("Error setting up device ID:", error));
        else Updates.reloadAsync();
      }
    });
    if (Platform.OS === "web") return setIsLoading(false);

    const handleCheckForUpdatesNatively = async () => {
      try {
        const res = await fetch(
          API_URL.replace("api", "updates/is-update-available"),
          fetchOptions<RequestIsUpdateAvailable<"android">>("POST", {
            buildType: "android",
            currentVersion: Constants.expoConfig?.extra?.version || "0.0.0",
            platformOS: undefined,
          }),
        );
        const result = (await res.json()) as ResponseIsUpdateAvailable;
        if (!result.updateAvailable) return;

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
    };
    const handleCheckForUpdates = async () => {
      try {
        await handleCheckForUpdatesNatively();
        saveDataSecure("_lastUpdateCheck", Date.now());

        const isAvailable = await isNewUpdateAvailable();
        if (!isAvailable) return;

        await fetchAndApplyUpdate();
      } catch (error) {
        logError("Error while updating the app", error);
      } finally {
        setIsLoading(false);
      }
    };

    handleCheckForUpdates();
    const id = setIntervalPolyfill(handleCheckForUpdates, 8 * 60 * 60 * 1000);

    return () => {
      clearIntervalPolyfill(id);
    };
  }, []);

  if (isLoading) return null;

  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
};

export default App;
