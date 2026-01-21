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
  getClipboardHistory: async () => [],
  setClipboardHistory: async () => {
    return;
  },
  hideClipboardWindow: () => {
    return;
  },
  onClipboardItemsUpdated: () => {
    return;
  },
  showClipboardWindow: () => void 0,

  authenticate: async () => false,
  copyFileToTemp: async () => ({ success: false }),
  removeFile: async () => ({ success: false }),
  getSafeFolder: async () => "unknown",
  pickFolder: async () => "canceled",
  encryptFiles: async () => ({ success: false }),
  renameVaultItem: async () => ({ success: false }),
  loadEncryptedFiles: async () => [],
  actionWithVaultItem: async () => ({ success: false }),
  getFileInfo: async () => null,
  clearDecryptedFolderDirectory: async () => {},
  askPath: async () => null,
  zipFolder: async (_1, _2, _3, _4, onError) =>
    onError?.(new Error("Not implemented")) || "",
};

let windowModule: ContextBridgeType["UtilitiesForPC"] = defaultWindow;

export const supportedPlatformsWeb: Platform["OS"][] = ["web", "windows"];

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
