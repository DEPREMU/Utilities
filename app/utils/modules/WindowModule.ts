import { REPLACERS } from "../constants";
import { ContextBridgeType } from "@types";

const voidFunction = () => {};
const falseFunction = async () => false;
const successFunction = async () => ({ success: true });
const asyncVoidFunction = async () => {};

const defaultWindow: ContextBridgeType["UtilitiesForPC"] = {
  notifyLoginStatus: voidFunction,
  readClipboard: () => "",
  setClipboard: voidFunction,
  turnOffComputer: falseFunction,
  restartComputer: falseFunction,
  setData: voidFunction,
  saveData: successFunction,
  loadData: async () => null,
  isElectronBuild: falseFunction,
  removeData: falseFunction,
  sendNotification: () => {},
  getNativeData: async () => "unknown",
  executeCommand: async () => "",
  getClipboardHistory: async () => [],
  setClipboardHistory: asyncVoidFunction,
  hideClipboardWindow: voidFunction,
  onClipboardItemsUpdated: voidFunction,
  showClipboardWindow: voidFunction,
  authenticate: falseFunction,
  copyFileToTemp: successFunction,
  removeFile: successFunction,
  getSafeFolder: async () => "unknown",
  pickFolder: async () => "canceled",
  encryptFiles: successFunction,
  renameVaultItem: successFunction,
  loadEncryptedFiles: async () => [],
  actionWithVaultItem: successFunction,
  getFileInfo: async () => null,
  clearDecryptedFolderDirectory: asyncVoidFunction,
  askPath: async () => null,
  zipFolder: async (_1, _2, _3, _4, onError) =>
    onError?.(new Error("Not implemented")) || "",
  deleteFolderVault: asyncVoidFunction,
  renameFolderVault: asyncVoidFunction,
};

let windowModule: ContextBridgeType["UtilitiesForPC"] = defaultWindow;

const assignWindowModule = () => {
  const windowType: ContextBridgeType =
    (window as unknown as ContextBridgeType) || null;
  if (!windowType) return;
  if (!windowType.UtilitiesForPC) return;

  windowModule = windowType.UtilitiesForPC;
};

if (REPLACERS.isWeb) assignWindowModule();

export default windowModule;
