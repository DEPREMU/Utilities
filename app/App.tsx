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
import { Platform } from "react-native";
import AppNavigator from "./navigation/AppNavigator";
import AppProviders from "./context/AppProviders";
import { useEffect } from "react";
import { ResponseGetRandomUUID } from "@types";

const setupDeviceId = async () => {
  try {
    const deviceId = await loadDataSecure("_deviceId");
    if (deviceId) return;
    if (Platform.OS === "web") await saveDataSecure("_deviceId", v4());
    else
      fetch(await getRouteAPI("/getRandomUUID"), fetchOptions("POST")).then(
        async (res) => {
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
        },
      );
  } catch (error) {
    logError(chalk.red("Error setting up device ID:", error));
  }
};

configureNotificationChannel();

const App = () => {
  useEffect(() => {
    setupDeviceId();
  }, []);

  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
};

export default App;
