import type { TurboModule } from "react-native";
import { Platform, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  setUserData(token: string, userId: string): void;
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
  console.error("ClipboardModule is not available");
}

export default ClipboardModule;
