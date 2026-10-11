import { REPLACERS } from "@common";
import { DownloadableMimeType } from "@types";
import type { TurboModule } from "react-native";
import { DeviceEventEmitter, TurboModuleRegistry } from "react-native";

type FileMetadata = {
  scheme: "content" | "file";
  fileName: string | null;
  mimeType: DownloadableMimeType | null;
};

export interface Spec extends TurboModule {
  getFileMetadata: (url: string) => Promise<FileMetadata>;
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
  checkPackageInstallPermission: () => Promise<boolean>;
  requestPackageInstallPermission: () => Promise<
    "SETTINGS_OPENED" | "ALREADY_GRANTED" | "NOT_SUPPORTED"
  >;
  installPackage: (filePath: string) => Promise<boolean>;
  viewDownloadedFile: (sourcePath: string) => Promise<string>;
}

const NativeFunctionsModule = REPLACERS.isNative
  ? TurboModuleRegistry.getEnforcing<Spec>("NativeFunctionsModule")
  : (null as never);

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
