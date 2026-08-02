import { REPLACERS } from "@common";
import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

interface Spec extends TurboModule {
  start: (titleNotification: string, messageNotification: string) => void;
  stop: () => void;
  isRunning(): Promise<boolean>;
  getMethods(): Promise<string[]>;
  setClipboardText(text: string): void;
  stopClipboardService(): void;
  startClipboardService(): void;
  requestClipboardConfigEvent(): void;
  setReactAlive(alive: boolean): void;
}

const voidFunc = () => {};

const defaultBackgroundModule: Spec = {
  stop: voidFunc,
  start: voidFunc,
  isRunning: async () => false,
  getMethods: async () => [],
  setReactAlive: voidFunc,
  setClipboardText: voidFunc,
  stopClipboardService: voidFunc,
  startClipboardService: voidFunc,
  requestClipboardConfigEvent: voidFunc,
};

export const BackgroundModule = REPLACERS.isNative
  ? TurboModuleRegistry.getEnforcing<Spec>("BackgroundServiceModule")
  : defaultBackgroundModule;
