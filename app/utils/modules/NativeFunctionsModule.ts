import { logError } from "../functions";
import type { TurboModule } from "react-native";
import { Platform, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  checkOverlayPermission: () => Promise<boolean>;
  requestOverlayPermission: () => Promise<
    "NOT_NEEDED" | "SETTINGS_OPENED" | "NOT_AVAILABLE"
  >;
  checkDoNotDisturbPermission: () => Promise<boolean>;
  requestDoNotDisturbPermission: () => Promise<
    "NOT_NEEDED" | "ALREADY_GRANTED" | "SETTINGS_OPENED"
  >;
  enableDoNotDisturb: () => Promise<
    "NOT_SUPPORTED" | "PERMISSION_REQUIRED" | "ENABLED"
  >;
  disableDoNotDisturb: () => Promise<
    "NOT_SUPPORTED" | "PERMISSION_REQUIRED" | "DISABLED"
  >;
  requestIgnoreBatteryOptimizations: () => void;
  isIgnoringBatteryOptimizations: () => Promise<boolean>;
  openApp: () => void;
  requestAutoStartPermission: () => Promise<
    "SETTINGS_OPENED" | "GENERIC_SETTINGS_OPENED"
  >;
}

const defaultNativeFunctionsModule: Spec = {
  checkOverlayPermission: async () => false,
  requestOverlayPermission: async () => "NOT_AVAILABLE",
  checkDoNotDisturbPermission: async () => false,
  requestDoNotDisturbPermission: async () => "NOT_NEEDED",
  enableDoNotDisturb: async () => "NOT_SUPPORTED",
  disableDoNotDisturb: async () => "NOT_SUPPORTED",
  isIgnoringBatteryOptimizations: async () => false,
  requestIgnoreBatteryOptimizations: () => {},
  openApp: () => {},
  requestAutoStartPermission: async () => "GENERIC_SETTINGS_OPENED",
};

const NativeFunctionsModule =
  Platform.OS !== "android"
    ? defaultNativeFunctionsModule
    : TurboModuleRegistry.getEnforcing<Spec>("NativeFunctionsModule");

if (process.env.NODE_ENV === "development" && Platform.OS === "android") {
  logError("NativeFunctionsModule is not available.");
}

export default NativeFunctionsModule;
