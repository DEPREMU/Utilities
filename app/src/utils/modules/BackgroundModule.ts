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

if (REPLACERS.isDev && REPLACERS.isNative)
  import("@utils").then(({ logger, setTimeoutPolyfill }) => {
    setTimeoutPolyfill(() => {
      if (!BackgroundModule || !Object.keys(BackgroundModule).length) {
        logger.error(
          "BackgroundServiceModule is not available.",
          BackgroundModule,
        );
      } else {
        logger.log(
          "BackgroundServiceModule is available.",
          Object.keys(BackgroundModule),
        );
      }
    }, 2000);
  });

export { BackgroundModule };
