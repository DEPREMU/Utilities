import { Platform } from "react-native";
import {
  ChannelsIpcRenderer,
  ContextBridgeType,
  ExpectedStorageTypes,
} from "@types";

const defaultWindow: ContextBridgeType["UtilitiesForPC"] = {
  notifyLoginStatus: () => {},
  readClipboard: () => "",
  setClipboard: (_text: string) => {},
  turnOffComputer: async () => false,
  restartComputer: async () => false,
  setData: () => {},
  saveData: async () => ({ success: false }),
  loadData: async <T extends keyof ExpectedStorageTypes<"BOTH">>() =>
    null as unknown as ChannelsIpcRenderer<T>["load-data"]["functionReturn"],
  isElectronBuild: async () => false,
  removeData: async () => false,
};

let windowModule: ContextBridgeType["UtilitiesForPC"] = defaultWindow;

export const supportedPlatformsWeb: Platform["OS"][] = [
  "web",
  "macos",
  "windows",
];

const assignWindowModule = () => {
  if (!supportedPlatformsWeb.includes(Platform.OS)) return;
  const windowType: ContextBridgeType =
    (window as unknown as ContextBridgeType) || null;
  if (!windowType) return;
  if (!windowType.UtilitiesForPC) return;

  windowModule = windowType.UtilitiesForPC;
};
assignWindowModule();

export default windowModule;
