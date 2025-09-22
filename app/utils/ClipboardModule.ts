import chalk from "chalk";
import type { TurboModule } from "react-native";
import { Platform, TurboModuleRegistry } from "react-native";
import { logError } from "./functions";
import { LanguagesSupported } from "@types";

export interface Spec extends TurboModule {
  setUserData(
    token: string,
    userId: string,
    lang: LanguagesSupported,
    deviceId: string,
  ): void;
  startClipboardService(): void;
  stopClipboardService(): void;
  isRunning(): Promise<boolean>;
  getMethods(): Promise<string[]>;
}

const defaultClipboardModule: Spec = {
  setUserData: (_: string, __: string) => {},
  startClipboardService: () => {},
  stopClipboardService: () => {},
  isRunning: async () => false,
  getMethods: async () => [],
};

const ClipboardModule =
  Platform.OS === "android"
    ? TurboModuleRegistry.getEnforcing<Spec>("ClipboardModule")
    : defaultClipboardModule;

if (!ClipboardModule || Object.keys(ClipboardModule).length === 0) {
  logError(chalk.red("ClipboardModule is not available"));
}

export default ClipboardModule;
