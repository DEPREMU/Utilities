import {
  logError,
  getRouteAPI,
  fetchOptions,
  loadDataSecure,
  saveDataSecure,
  configureNotificationChannel,
} from "@utils";
import chalk from "chalk";
import { v4 } from "uuid";
import * as Updates from "expo-updates";
import { Platform } from "react-native";
import AppNavigator from "./navigation/AppNavigator";
import AppProviders from "./context/AppProviders";
import React, { useEffect } from "react";
import { ResponseGetRandomUUID } from "@types";

const hasDeviceId = async (): Promise<boolean> => {
  try {
    const deviceId = await loadDataSecure("_deviceId");
    if (deviceId) return true;
    if (Platform.OS === "web") await saveDataSecure("_deviceId", v4() + v4());
    else {
      const res = await fetch(
        await getRouteAPI("/getRandomUUID"),
        fetchOptions("POST"),
      );

      const result = (await res.json()) as ResponseGetRandomUUID;
      let uuid = result.uuid;
      if (!uuid)
        uuid = Array.from({ length: 5 }, () =>
          Math.random().toString(36).substring(2, 15),
        ).join("");

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
      } finally {
        setIsLoading(false);
      }
    });
  }, []);

  if (isLoading) return null;

  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
};

export default App;
