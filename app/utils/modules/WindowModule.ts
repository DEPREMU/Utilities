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
  showClipboardWindow: () => {
    return;
  },

  vaultPickFiles: async () => ({ canceled: true, paths: [] }),
  vaultPickFolders: async () => ({ canceled: true, paths: [] }),
  vaultEnsureInitialized: async () => ({ ok: false, error: "Not Electron" }),
  vaultLoadSettings: async () => null,
  vaultSaveSettings: async () => ({ ok: false, error: "Not Electron" }),
  vaultLoadWrappedMasterKey: async () => null,
  vaultSaveWrappedMasterKey: async () => ({ ok: false, error: "Not Electron" }),
  vaultLoadAuthVerifier: async () => null,
  vaultSaveAuthVerifier: async () => ({ ok: false, error: "Not Electron" }),
  vaultListFolders: async () => [],
  vaultCreateFolder: async () => {
    throw new Error("Not Electron");
  },
  vaultUpdateFolder: async () => {
    throw new Error("Not Electron");
  },
  vaultDeleteFolder: async () => false,
  vaultListItems: async () => [],
  vaultSaveItemMetadata: async () => ({ ok: false, error: "Not Electron" }),
  vaultDeleteItem: async () => false,
  vaultUnlock: async () => ({ ok: false, error: "Not Electron" }),
  vaultLock: () => {},
  vaultEncryptPaths: async () => ({ ok: false, error: "Not Electron" }),
  vaultDecryptToTemp: async () => ({ ok: false, error: "Not Electron" }),
  vaultCleanTempSession: async () => false,
  vaultCancelJob: async () => false,
  vaultZip: async () => ({ ok: false, error: "Not Electron" }),
  vaultUnzip: async () => ({ ok: false, error: "Not Electron" }),
  vaultExportBackup: async () => ({ ok: false, error: "Not Electron" }),
  onVaultProgress: () => {},
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
