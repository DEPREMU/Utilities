import { Platform } from "react-native";
import { ContextBridgeType } from "@types";

const defaultWindow: ContextBridgeType["UtilitiesForPC"] = {
  notifyLoginStatus: () => {},
  readClipboard: () => "",
  setClipboard: () => {},
  turnOffComputer: async () => false,
  restartComputer: async () => false,
  setData: () => {},
  saveData: async () => ({ success: false }),
  loadData: async () => null,
  isElectronBuild: async () => false,
  removeData: async () => false,
  sendNotification: () => {},
  getNativeData: async () => "unknown",
  executeCommand: async () => "",
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
