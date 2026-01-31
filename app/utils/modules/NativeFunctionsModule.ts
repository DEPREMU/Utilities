import { REPLACERS } from "../TOP_LEVEL";
import type { TurboModule } from "react-native";
import { DeviceEventEmitter, TurboModuleRegistry } from "react-native";

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
  minimizeApp: () => void;
  wasLaunchedFromService: () => Promise<boolean>;
  isDoNotDisturbEnabled: () => Promise<boolean>;
  subscribeToProgressEncrypt: (
    callback: (progress: number, filePath: string) => void,
  ) => () => void;
  subscribeToProgressDecrypt: (
    callback: (progress: number, filePath: string) => void,
  ) => () => void;
  decryptFile: (
    inputPath: string,
    outputPath: string,
    password: string,
  ) => Promise<boolean>;
  encryptFile: (
    inputPath: string,
    outputPath: string,
    password: string,
  ) => Promise<boolean>;
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
  minimizeApp: () => {},
  wasLaunchedFromService: async () => false,
  isDoNotDisturbEnabled: async () => false,
  subscribeToProgressDecrypt: () => () => {},
  subscribeToProgressEncrypt: () => () => {},
  decryptFile: async () => false,
  encryptFile: async () => false,
};

const NativeFunctionsModule = REPLACERS.isWeb
  ? defaultNativeFunctionsModule
  : TurboModuleRegistry.getEnforcing<Spec>("NativeFunctionsModule");

if (REPLACERS.isNative) {
  const methods = [
    {
      eventName: "FileEncryptionProgress",
      subscribeMethod: "subscribeToProgressEncrypt",
    },
    {
      eventName: "FileDecryptionProgress",
      subscribeMethod: "subscribeToProgressDecrypt",
    },
  ] as const;

  methods.forEach(({ eventName, subscribeMethod }) => {
    NativeFunctionsModule[subscribeMethod] = (callback) => {
      const sub = DeviceEventEmitter.addListener(eventName, (data) => {
        const { progress = 0, filePath = "unknown" } = data || {};
        callback?.(progress, filePath);
      });

      return sub.remove;
    };
  });
}

if (REPLACERS.isDev && REPLACERS.isNative && !NativeFunctionsModule) {
  import("../functions/debug").then(({ logger }) => {
    logger?.error("NativeFunctionsModule is not available.");
  });
}

export default NativeFunctionsModule;
