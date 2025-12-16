import { logError } from "../functions";
import type { TurboModule } from "react-native";
import { LanguagesSupported } from "@types";
import { Platform, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  start: (titleNotification: string, messageNotification: string) => void;
  stop: () => void;
  setUserData(
    token: string,
    userId: string,
    lang: LanguagesSupported,
    deviceId: string,
  ): void;
  isRunning(): Promise<boolean>;
  getMethods(): Promise<string[]>;
  setClipboardText(text: string): void;
  stopClipboardService(): void;
  startClipboardService(): void;
  setReactAlive(alive: boolean): void;
}

const defaultBackgroundModule: Spec = {
  start: () => {},
  stop: () => {},
  setUserData: () => {},
  isRunning: async () => false,
  getMethods: async () => [],
  setReactAlive: () => {},
  setClipboardText: () => {},
  stopClipboardService: () => {},
  startClipboardService: () => {},
};

const BackgroundModule =
  Platform.OS === "android"
    ? TurboModuleRegistry.getEnforcing<Spec>("BackgroundServiceModule")
    : defaultBackgroundModule;

if (
  process.env.NODE_ENV === "development" &&
  (!BackgroundModule || Object.keys(BackgroundModule).length === 0)
) {
  logError("BackgroundServiceModule is not available");
}

export default BackgroundModule;
