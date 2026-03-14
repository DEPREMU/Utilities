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

const voidFunc = () => {};
const asyncFalse = async () => false;
const notSupported = async () => "NOT_SUPPORTED" as const;

const defaultNativeFunctionsModule: Spec = {
  checkOverlayPermission: asyncFalse,
  requestOverlayPermission: async () => "NOT_AVAILABLE",
  checkDoNotDisturbPermission: asyncFalse,
  requestDoNotDisturbPermission: async () => "NOT_NEEDED",
  enableDoNotDisturb: notSupported,
  disableDoNotDisturb: notSupported,
  isIgnoringBatteryOptimizations: asyncFalse,
  requestIgnoreBatteryOptimizations: voidFunc,
  openApp: voidFunc,
  requestAutoStartPermission: async () => "GENERIC_SETTINGS_OPENED",
  minimizeApp: voidFunc,
  wasLaunchedFromService: asyncFalse,
  isDoNotDisturbEnabled: asyncFalse,
  subscribeToProgressDecrypt: () => voidFunc,
  subscribeToProgressEncrypt: () => voidFunc,
  decryptFile: asyncFalse,
  encryptFile: asyncFalse,
};

const NativeFunctionsModule = REPLACERS.isNative
  ? TurboModuleRegistry.getEnforcing<Spec>("NativeFunctionsModule")
  : defaultNativeFunctionsModule;

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

export { NativeFunctionsModule };
