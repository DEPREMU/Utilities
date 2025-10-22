import * as Location from "expo-location";
import { Alert, Platform } from "react-native";

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

  await new Promise((resolve) => {
    Alert.alert(
      "Location Permission",
      "This app needs location access to function properly.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: "OK",
          onPress: async () => {
            const { status } =
              await Location.requestForegroundPermissionsAsync();
            const granted = status === "granted";
            resolve(granted);
          },
        },
      ],
    );
  });
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === "granted";
};
