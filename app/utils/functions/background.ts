import { t as i18n } from "i18next";
import * as Location from "expo-location";
import { Alert, Platform } from "react-native";
import { getNotifications, stringifyData } from "./appManagement";
import { saveData } from "./storageManagement";
import { typeT } from "@types";

export const isLocationEnabled = async (): Promise<boolean> => {
  if (Platform.OS === "web") return false;

  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
};

export const askLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === "web") return false;
  let { status } = await Location.getForegroundPermissionsAsync();
  let granted = status === "granted";
  if (granted) {
    ({ status } = await Location.getBackgroundPermissionsAsync());
    granted = status === "granted";
  }
  if (granted) return true;

  const t: typeT = i18n as typeT;

  granted = await new Promise((resolve) => {
    Alert.alert(t("locationPermission"), t("locationPermissionMessage"), [
      {
        text: t("cancel"),
        style: "cancel",
        onPress: () => resolve(false),
      },
      {
        text: t("accept"),
        onPress: async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          const granted = status === "granted";
          resolve(granted);
        },
      },
    ]);
  });
  if (granted) {
    ({ status } = await Location.requestBackgroundPermissionsAsync());
    granted = status === "granted";
  }

  const notifications = await getNotifications();
  const newNotifications = { ...notifications };
  newNotifications.enabled.locationEnabled = granted;
  if (stringifyData(notifications) !== stringifyData(newNotifications))
    await saveData("@notifications", newNotifications);

  return granted;
};
