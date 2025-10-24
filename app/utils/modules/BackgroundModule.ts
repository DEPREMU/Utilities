import chalk from "chalk";
import { logError } from "../functions";
import type { TurboModule } from "react-native";
import { Platform, TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  start: (titleNotification: string, messageNotification: string) => void;
  stop: () => void;
}

const defaultBackgroundModule: Spec = {
  start: () => {},
  stop: () => {},
};

const BackgroundModule =
  Platform.OS === "android"
    ? TurboModuleRegistry.getEnforcing<Spec>("BackgroundServiceModule")
    : defaultBackgroundModule;

if (
  process.env.NODE_ENV === "development" &&
  (!BackgroundModule || Object.keys(BackgroundModule).length === 0)
) {
  logError(chalk.red("BackgroundServiceModule is not available"));
}

export default BackgroundModule;
