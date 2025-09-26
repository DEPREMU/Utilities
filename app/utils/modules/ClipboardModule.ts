import chalk from "chalk";
import { logError } from "../functions";
import type { TurboModule } from "react-native";
import { LanguagesSupported } from "@types";
import { Platform, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
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
}

const defaultClipboardModule: Spec = {
  setUserData: (_: string, __: string) => {},
  isRunning: async () => false,
  getMethods: async () => [],
  setClipboardText: () => {},
  stopClipboardService: () => {},
  startClipboardService: () => {},
};

const ClipboardModule =
  Platform.OS === "android"
    ? TurboModuleRegistry.getEnforcing<Spec>("ClipboardModule")
    : defaultClipboardModule;

if (
  process.env.NODE_ENV === "development" &&
  (!ClipboardModule || Object.keys(ClipboardModule).length === 0)
) {
  logError(chalk.red("ClipboardModule is not available"));
}

export default ClipboardModule;
