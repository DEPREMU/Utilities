import { logger } from "../functions";
import { REPLACERS } from "../constants/constants";
import type { TurboModule } from "react-native";
import { LanguagesSupported } from "@types";
import { TurboModuleRegistry } from "react-native";

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

const BackgroundModule = REPLACERS.isNative
  ? TurboModuleRegistry.getEnforcing<Spec>("BackgroundServiceModule")
  : defaultBackgroundModule;

if (
  REPLACERS.isDev &&
  (!BackgroundModule || Object.keys(BackgroundModule).length === 0)
) {
  logger.error("BackgroundServiceModule is not available");
}

export default BackgroundModule;
