import { REPLACERS } from "@common";
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

const asyncFalse = async () => false;

const defaultKeyboardModule: Spec = {
  sendKey: async () => "",
  backspace: asyncFalse,
  enter: asyncFalse,
  setLayout: asyncFalse,
  resetLayout: asyncFalse,
  setClipboardSuggestions: asyncFalse,
};

export const keyboardModule: Spec = REPLACERS.isNative
  ? TurboModuleRegistry.getEnforcing<Spec>("KeyboardModule")
  : defaultKeyboardModule;
