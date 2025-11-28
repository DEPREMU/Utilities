import { typeT } from "@types";
import { saveData } from "./storageManagement";
import { t as i18n } from "i18next";
import * as Location from "expo-location";
import NativeFunctionsModule from "../modules/NativeFunctionsModule";
import { Alert, AppState, Platform } from "react-native";
import { getNotifications, stringifyData } from "./appManagement";

/**
 * Checks if location services are enabled on the device.
 *
 * @returns A promise that resolves to `true` if location services are enabled,
 *          `false` otherwise. Always returns `false` for web platform.
 *
 * @remarks
 * This function will return `false` immediately on web platforms as location
 * services checking is not supported. On mobile platforms, it uses the
 * Location API to check if services are enabled.
 */
export const isLocationEnabled = async (): Promise<boolean> => {
  if (Platform.OS === "web") return false;

  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
};

/**
 * Requests location permissions (both foreground and background) from the user.
 *
 * This function first checks if the app already has the necessary permissions.
 * If not, it displays an alert dialog asking the user to grant location permissions.
 * After handling permissions, it updates the notification settings to reflect
 * the current location permission status.
 *
 * @returns A Promise that resolves to `true` if both foreground and background
 *          location permissions are granted, `false` otherwise. Always returns
 *          `false` on web platform.
 */
export const askLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === "web") return false;

  let { status } = await Location.getForegroundPermissionsAsync();

  let granted = status === "granted";
  if (granted) {
    ({ status } = await Location.getBackgroundPermissionsAsync());
    granted = status === "granted";
    if (granted) return true;
  }

  if (await NativeFunctionsModule?.checkOverlayPermission?.())
    NativeFunctionsModule?.openApp?.();

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
        onPress: () => {
          (async () => {
            const { status } =
              await Location.requestForegroundPermissionsAsync();
            const granted = status === "granted";
            resolve(granted);
          })();
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

/**
 * Requests display over other apps permission on Android devices.
 *
 * This function checks if the app already has overlay permission, and if not,
 * prompts the user with an alert dialog to grant the permission. If the user
 * accepts, it requests foreground location permissions and then overlay permissions.
 * When the settings are opened, it waits up to 15 seconds for the user to return
 * to the app before checking the permission status again.
 *
 * @returns A promise that resolves to `true` if the overlay permission is granted,
 *          `false` otherwise. Always returns `false` on non-Android platforms.
 */
export const askDisplayOverOtherAppsPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return false;

  let hasPermission = await NativeFunctionsModule.checkOverlayPermission();
  if (hasPermission) return true;

  const t: typeT = i18n as typeT;

  const alert = await new Promise((resolve) => {
    Alert.alert(t("overlayPermission"), t("overlayPermissionMessage"), [
      {
        text: t("cancel"),
        style: "cancel",
        onPress: () => resolve(false),
      },
      {
        text: t("accept"),
        onPress: () => {
          (async () => {
            const { status } =
              await Location.requestForegroundPermissionsAsync();
            const granted = status === "granted";
            resolve(granted);
          })();
        },
      },
    ]);
  });
  if (!alert) return await NativeFunctionsModule.checkOverlayPermission();

  hasPermission = await NativeFunctionsModule.checkOverlayPermission();
  if (!hasPermission) {
    const opened = await NativeFunctionsModule.requestOverlayPermission();

    if (opened === "SETTINGS_OPENED") {
      let timePassed = 0;
      while (timePassed < 15000 && AppState.currentState === "active") {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        timePassed += 1000;
      }
      hasPermission = await NativeFunctionsModule.checkOverlayPermission();
    }
  }
  return hasPermission;
};

/**
 * Requests battery optimization permission on Android devices.
 *
 * This function checks if the app is already ignoring battery optimizations.
 * If not, it prompts the user with an alert dialog to request the permission.
 * After user acceptance, it opens the system settings and waits for the user
 * to return to the app (up to 5 seconds) before rechecking the permission status.
 *
 * @returns A promise that resolves to `true` if battery optimization permission
 * is granted or already enabled, `false` otherwise. Always returns `false` on non-Android platforms.
 *
 * @remarks
 * - Only works on Android platform (returns `false` immediately on other platforms)
 * - Uses native module `NativeFunctionsModule` to check and request permissions
 * - Displays a localized alert dialog using i18n translations
 * - Waits up to 5 seconds for the app to become active again after permission request
 * - If user cancels the alert, immediately rechecks current permission status
 */
export const askBatteryOptimizationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return false;

  let hasPermission =
    await NativeFunctionsModule.isIgnoringBatteryOptimizations();
  if (hasPermission) return true;

  if (await NativeFunctionsModule?.checkOverlayPermission?.())
    NativeFunctionsModule?.openApp?.();

  const t: typeT = i18n as typeT;

  const alert = await new Promise((resolve) => {
    Alert.alert(
      t("batteryOptimizationPermission"),
      t("batteryOptimizationPermissionMessage"),
      [
        {
          text: t("cancel"),
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: t("accept"),
          onPress: () => {
            NativeFunctionsModule.requestIgnoreBatteryOptimizations();
            resolve(true);
          },
        },
      ],
    );
  });
  if (!alert)
    return await NativeFunctionsModule.isIgnoringBatteryOptimizations();

  hasPermission = await NativeFunctionsModule.isIgnoringBatteryOptimizations();
  if (!hasPermission) {
    NativeFunctionsModule.requestIgnoreBatteryOptimizations();

    let seconds = 0;
    while (AppState.currentState !== "active" && seconds < 5) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      seconds++;
    }
    hasPermission =
      await NativeFunctionsModule.isIgnoringBatteryOptimizations();
  }
  return hasPermission;
};

/**
 * Requests autostart permission on Android devices for specific manufacturers.
 *
 * This function opens the device-specific autostart settings page where the user
 * can enable automatic app launch on device boot. Different manufacturers (Xiaomi,
 * Oppo, Vivo, Huawei, Honor, Asus, etc.) have different settings locations, so
 * this function detects the manufacturer and opens the appropriate settings screen.
 *
 * Before opening settings, if the app has overlay permission, it will automatically
 * open the app to show the permission dialog. This ensures the user sees the request
 * even if the app is in the background.
 *
 * @returns A promise that resolves to `true` if settings were successfully opened,
 *          `false` otherwise. Always returns `false` on non-Android platforms.
 *
 * @remarks
 * - Only works on Android platform (returns `false` immediately on other platforms)
 * - Uses native module `NativeFunctionsModule` to open manufacturer-specific settings
 * - Opens the app before showing the permission dialog if overlay permission exists
 * - Displays a localized alert dialog using i18n translations
 * - Falls back to generic app settings if manufacturer-specific settings fail
 * - Supports: Xiaomi, Redmi, Oppo, Vivo, Letv, Honor, Huawei, Asus, and generic devices
 */
export const askAutoStartPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return false;

  if (await NativeFunctionsModule?.checkOverlayPermission?.())
    NativeFunctionsModule?.openApp?.();

  const t: typeT = i18n as typeT;

  const alert = await new Promise((resolve) => {
    Alert.alert(t("autoStartPermission"), t("autoStartPermissionMessage"), [
      {
        text: t("cancel"),
        style: "cancel",
        onPress: () => resolve(false),
      },
      {
        text: t("accept"),
        onPress: () => resolve(true),
      },
    ]);
  });

  if (!alert) return false;

  try {
    const result = await NativeFunctionsModule.requestAutoStartPermission();
    return ["GENERIC_SETTINGS_OPENED", "SETTINGS_OPENED"].includes(result);
  } catch {
    return false;
  }
};
