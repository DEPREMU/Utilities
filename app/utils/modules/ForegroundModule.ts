import chalk from "chalk";
import { logError } from "../functions";
import type { TurboModule } from "react-native";
import { Platform, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  start: (titleNotification: string, messageNotification: string) => void;
  stop: () => void;
}

const defaultForegroundModule: Spec = {
  start: () => {},
  stop: () => {},
};

const ForegroundModule =
  Platform.OS === "android"
    ? TurboModuleRegistry.getEnforcing<Spec>("ForegroundServiceModule")
    : defaultForegroundModule;

if (
  process.env.NODE_ENV === "development" &&
  (!ForegroundModule || Object.keys(ForegroundModule).length === 0)
) {
  logError(chalk.red("ForegroundServiceModule is not available"));
}

export default ForegroundModule;
