import { REPLACERS } from "../TOP_LEVEL";
import type { TurboModule } from "react-native";
import { LanguagesSupported } from "@types";
import { TurboModuleRegistry } from "react-native";

interface Spec extends TurboModule {
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

const voidFunc = () => {};

const defaultBackgroundModule: Spec = {
  start: voidFunc,
  stop: voidFunc,
  setUserData: voidFunc,
  isRunning: async () => false,
  getMethods: async () => [],
  setReactAlive: voidFunc,
  setClipboardText: voidFunc,
  stopClipboardService: voidFunc,
  startClipboardService: voidFunc,
};

export const BackgroundModule = REPLACERS.isNative
  ? TurboModuleRegistry.getEnforcing<Spec>("BackgroundServiceModule")
  : defaultBackgroundModule;
