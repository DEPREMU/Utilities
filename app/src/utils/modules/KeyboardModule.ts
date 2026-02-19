import { REPLACERS } from "../TOP_LEVEL";
import { ClipboardItem } from "@types";
import { TurboModule, TurboModuleRegistry } from "react-native";

type KeyboardLayout = string[][];

interface Spec extends TurboModule {
  sendKey: (key: string) => Promise<string>;
  backspace: () => Promise<boolean>;
  enter: () => Promise<boolean>;
  setLayout: (layout: KeyboardLayout) => Promise<boolean>;
  resetLayout: () => Promise<boolean>;
  setClipboardSuggestions: (list: ClipboardItem[]) => Promise<boolean>;
}

const defaultKeyboardModule: Spec = {
  sendKey: async () => "",
  backspace: async () => false,
  enter: async () => false,
  setLayout: async () => false,
  resetLayout: async () => false,
  setClipboardSuggestions: async () => false,
};

const keyboardModule: Spec = REPLACERS.isNative
  ? TurboModuleRegistry.getEnforcing<Spec>("KeyboardModule")
  : defaultKeyboardModule;

if (REPLACERS.isDev && REPLACERS.isNative)
  import("@utils").then(({ logger, setTimeoutPolyfill }) => {
    setTimeoutPolyfill(() => {
      if (!keyboardModule || !Object.keys(keyboardModule).length) {
        logger.error("KeyboardModule is not available.", keyboardModule);
      } else {
        logger.log("KeyboardModule is available.", Object.keys(keyboardModule));
      }
    }, 2000);
  });

export { keyboardModule };
