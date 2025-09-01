import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  setUserData(token: string, userId: string): void;
  startClipboardService(): void;
  stopClipboardService(): void;
  isRunning(): Promise<boolean>;
  getMethods(): Promise<string[]>;
}

const ClipboardModule =
  TurboModuleRegistry.getEnforcing<Spec>("ClipboardModule");

if (!ClipboardModule || Object.keys(ClipboardModule).length === 0) {
  console.error("ClipboardModule is not available");
}

export default ClipboardModule;
