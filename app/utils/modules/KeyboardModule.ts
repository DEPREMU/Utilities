import { logger } from "../functions/debug";
import { REPLACERS } from "../TOP_LEVEL";
import { ClipboardItem } from "@types";
import { NativeModules } from "react-native";

type KeyboardLayout = string[][];

export interface KeyboardModuleSpec {
  sendKey: (key: string) => Promise<string>;
  backspace: () => Promise<boolean>;
  enter: () => Promise<boolean>;
  setLayout: (layout: KeyboardLayout) => Promise<boolean>;
  resetLayout: () => Promise<boolean>;
  setClipboardSuggestions: (list: ClipboardItem[]) => Promise<boolean>;
}

const defaultKeyboardModule: KeyboardModuleSpec = {
  sendKey: async () => "",
  backspace: async () => false,
  enter: async () => false,
  setLayout: async () => false,
  resetLayout: async () => false,
  setClipboardSuggestions: async () => false,
};

const { KeyboardModule } = NativeModules;

const keyboardModule: KeyboardModuleSpec =
  REPLACERS.isNative && KeyboardModule
    ? (KeyboardModule as KeyboardModuleSpec)
    : defaultKeyboardModule;

if (
  REPLACERS.isDev &&
  REPLACERS.isNative &&
  (!KeyboardModule || Object.keys(KeyboardModule).length === 0)
) {
  logger.error("KeyboardModule is not available.");
}

export type { KeyboardLayout };
export default keyboardModule;
