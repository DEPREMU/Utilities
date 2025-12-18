import { logError } from "../functions/debug";
import { NativeModules, Platform } from "react-native";

type KeyboardLayout = string[][];

export interface KeyboardModuleSpec {
  sendKey: (key: string) => Promise<string>;
  backspace: () => Promise<boolean>;
  enter: () => Promise<boolean>;
  setLayout: (layout: KeyboardLayout) => Promise<boolean>;
  resetLayout: () => Promise<boolean>;
  setClipboardSuggestions: (list: string[]) => Promise<boolean>;
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
  Platform.OS === "android" && KeyboardModule
    ? (KeyboardModule as KeyboardModuleSpec)
    : defaultKeyboardModule;

if (
  process.env.NODE_ENV === "development" &&
  Platform.OS === "android" &&
  (!KeyboardModule || Object.keys(KeyboardModule).length === 0)
) {
  logError("KeyboardModule is not available.");
}

export type { KeyboardLayout };
export default keyboardModule;
