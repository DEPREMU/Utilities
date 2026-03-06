import { alerts } from "../services/alerts";
import { AppState } from "react-native";
import { REPLACERS } from "../TOP_LEVEL";
import * as Location from "expo-location";
import { Permission } from "@common";
import { permissionsData } from "@refs";
import { NativeFunctionsModule } from "@modules";

const TAG = "PERMISSIONS";

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
  if (REPLACERS.isWeb) return false;

  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
};

type OptionsAskPermission = {
  overrideDoNotAskAgain?: boolean;
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
const askLocationPermission = async (
  options?: OptionsAskPermission,
): Promise<void> => {
  if (REPLACERS.isWeb) return;

  const { notificationsManager, storageManagement, waitForTime } =
    await import("@utils");
  if (!storageManagement.hasUI) return;
  if (
    permissionsData.permissions.location.doNotAskAgain &&
    !options?.overrideDoNotAskAgain
  )
    return;

  let { status } = await Location.getForegroundPermissionsAsync();

  let granted = status === Location.PermissionStatus.GRANTED;
  if (granted) {
    ({ status } = await Location.getBackgroundPermissionsAsync());
    granted = status === Location.PermissionStatus.GRANTED;
    permissionsData.permissions.location.enabled = granted;
    if (granted) return;
  }

  if (permissionsData.hasOverlayPermission) NativeFunctionsModule.openApp?.();
  await waitForTime(500);

  granted = !!(await alerts.showAlert(
    "locationPermission",
    "locationPermissionMessage",
    async (doNotAskAgain, accepted) => {
      permissionsData.permissions.location.doNotAskAgain = doNotAskAgain;
      if (accepted) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        accepted = status === "granted";
        if (accepted) {
          const { status } = await Location.requestBackgroundPermissionsAsync();
          accepted = status === "granted";
        }
      }

      return accepted;
    },
    { addDoNotAskAgain: true },
  ));
  permissionsData.permissions.location.enabled = granted;

  notificationsManager.editNotification("locationEnabled", (prev) => ({
    ...prev,
    enabled: granted,
  }));
};

export const waitForAppToBeActive = async (): Promise<void> => {
  const { logger, waitForTime } = await import("@utils");

  await waitForTime(500);

  let step: "waitingForInactivity" | "waitingForActivity" | "done" =
    "waitingForInactivity";
  const startTime = Date.now();

  while (step !== "done") {
    if (Date.now() - startTime > 60000) {
      logger.warn(TAG, "User did not return to the app within 60 seconds.");
      break;
    }

    if (step === "waitingForInactivity") {
      if (AppState.currentState !== "active") {
        await waitForTime(500);
        step = "waitingForActivity";
      } else await waitForTime(100);
    } else if (step === "waitingForActivity") {
      if (AppState.currentState === "active") step = "done";
      else await waitForTime(100);
    }
  }
  await waitForTime(500);
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
const askDisplayOverOtherAppsPermission = async (
  options?: OptionsAskPermission,
): Promise<void> => {
  if (REPLACERS.isWeb) return;
  if (permissionsData.hasOverlayPermission) return;
  if (
    permissionsData.permissions.overlay.doNotAskAgain &&
    !options?.overrideDoNotAskAgain
  )
    return;

  const { logger } = await import("@utils");

  const granted = await alerts.showAlert(
    "overlayPermission",
    "overlayPermissionMessage",
    async (doNotAskAgain, accepted) => {
      permissionsData.permissions.overlay.doNotAskAgain = doNotAskAgain;
      return accepted;
    },
    { addDoNotAskAgain: true },
  );

  if (!granted) return;

  const state = await NativeFunctionsModule.requestOverlayPermission();
  if (state === "NOT_AVAILABLE") {
    logger.warn(TAG, "Overlay permission is not available on this device");
    return;
  } else if (state === "NOT_NEEDED") {
    logger.log(TAG, "Overlay permission is not needed on this device");
    return;
  } else if (state === "SETTINGS_OPENED") {
    await waitForAppToBeActive();
  }

  const hasPermission = await NativeFunctionsModule.checkOverlayPermission();

  permissionsData.hasOverlayPermission = hasPermission;
  permissionsData.permissions.overlay.enabled = hasPermission;
  permissionsData.permissions.overlay.lastAsked = Date.now();
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
const askBatteryOptimizationPermission = async (
  options?: OptionsAskPermission,
): Promise<void> => {
  if (REPLACERS.isWeb) return;
  if (
    permissionsData.permissions.batteryOptimization.doNotAskAgain &&
    !options?.overrideDoNotAskAgain
  )
    return;

  let hasPermission =
    await NativeFunctionsModule.isIgnoringBatteryOptimizations();

  permissionsData.permissions.batteryOptimization.enabled = hasPermission;
  if (hasPermission) return;

  const { waitForTime } = await import("@utils");

  if (permissionsData.hasOverlayPermission) NativeFunctionsModule.openApp?.();
  await waitForTime(500);

  const accepted = await alerts.showAlert(
    "batteryOptimizationPermission",
    "batteryOptimizationPermissionMessage",
    async (doNotAskAgain, accepted) => {
      permissionsData.permissions.batteryOptimization.doNotAskAgain =
        doNotAskAgain;
      return accepted;
    },
    { addDoNotAskAgain: true },
  );

  if (!accepted) {
    hasPermission =
      await NativeFunctionsModule.isIgnoringBatteryOptimizations();
    permissionsData.permissions.batteryOptimization.enabled = hasPermission;
    permissionsData.permissions.batteryOptimization.lastAsked = Date.now();
    return;
  }

  NativeFunctionsModule.requestIgnoreBatteryOptimizations();
  await waitForAppToBeActive();
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
const askAutoStartPermission = async (
  options?: OptionsAskPermission,
): Promise<void> => {
  if (REPLACERS.isWeb) return;
  if (
    permissionsData.permissions.autoStart.doNotAskAgain &&
    !options?.overrideDoNotAskAgain
  )
    return;

  if (permissionsData.hasOverlayPermission) NativeFunctionsModule?.openApp?.();

  const { logger } = await import("@utils");

  const accepted = await alerts.showAlert(
    "autoStartPermission",
    "autoStartPermissionMessage",
    async (doNotAskAgain, accepted) => {
      permissionsData.permissions.autoStart.doNotAskAgain = doNotAskAgain;
      return accepted;
    },
    { addDoNotAskAgain: true },
  );

  if (!accepted) return;

  const state = await NativeFunctionsModule.requestAutoStartPermission?.();
  if (state === "GENERIC_SETTINGS_OPENED" || state === "SETTINGS_OPENED") {
    await waitForAppToBeActive();
    permissionsData.permissions.autoStart = {
      ...permissionsData.permissions.autoStart,
      enabled: true,
      lastAsked: Date.now(),
      doNotAskAgain: false,
    };
  } else {
    logger.warn(
      TAG,
      "Auto-start permission settings could not be opened for this device.",
      "State returned:",
      state,
    );
  }
};

const askDoNotDisturbPermission = async (): Promise<void> => {
  if (REPLACERS.isWeb) return;
  if (
    permissionsData.permissions.doNotDisturb.doNotAskAgain ||
    permissionsData.permissions.doNotDisturb.enabled
  )
    return;

  let granted = await alerts.showAlert(
    "doNotDisturbPermission",
    "doNotDisturbPermissionMessage",
    async (doNotAskAgain, accepted) => {
      permissionsData.permissions.doNotDisturb.doNotAskAgain = doNotAskAgain;
      return accepted;
    },
    { addDoNotAskAgain: true },
  );

  const { NativeFunctionsModule } = await import("@modules");

  const state = await NativeFunctionsModule.requestDoNotDisturbPermission?.();
  if (state === "SETTINGS_OPENED") {
    await waitForAppToBeActive();
    granted = await NativeFunctionsModule.checkDoNotDisturbPermission?.();
  } else if (state === "ALREADY_GRANTED" || state === "NOT_NEEDED") {
    granted = true;
  }

  permissionsData.permissions.doNotDisturb = {
    ...permissionsData.permissions.doNotDisturb,
    enabled: !!granted,
    lastAsked: Date.now(),
  };
};

export const askPermissions = async (): Promise<void> => {
  if (REPLACERS.isWeb) return;

  await permissionsData.initializing;
  const { storageManagement } = await import("@utils");
  await storageManagement.waitUntilLoaded();

  const hasUi = storageManagement.hasUI;
  if (!hasUi) return;

  if (!permissionsData.permissions.location.doNotAskAgain)
    await askLocationPermission();
  if (!permissionsData.permissions.overlay.doNotAskAgain)
    await askDisplayOverOtherAppsPermission();
  if (!permissionsData.permissions.batteryOptimization.doNotAskAgain)
    await askBatteryOptimizationPermission();
  if (!permissionsData.permissions.autoStart.doNotAskAgain)
    await askAutoStartPermission();
  if (!permissionsData.permissions.doNotDisturb.doNotAskAgain)
    await askDoNotDisturbPermission();

  storageManagement.save("PERMISSIONS_DATA", permissionsData.permissions);
};
askPermissions();

export const askForPermission = async (
  permission: Permission,
  options?: OptionsAskPermission,
): Promise<boolean> => {
  let granted = false;

  switch (permission) {
    case "location":
      await askLocationPermission(options);
      granted = permissionsData.permissions.location.enabled;
      break;
    case "overlay":
      await askDisplayOverOtherAppsPermission();
      granted = permissionsData.hasOverlayPermission;
      break;
    case "batteryOptimization":
      await askBatteryOptimizationPermission();
      granted = permissionsData.permissions.batteryOptimization.enabled;
      break;
    case "autoStart":
      await askAutoStartPermission();
      granted = permissionsData.permissions.autoStart.enabled;
      break;
    case "doNotDisturb":
      await askDoNotDisturbPermission();
      granted = permissionsData.permissions.doNotDisturb.enabled;
      break;
    default:
      break;
  }

  return granted;
};
