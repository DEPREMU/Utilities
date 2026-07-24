import { REPLACERS } from "../TOP_LEVEL";
import { ContextBridgeType } from "@types";

const voidFunction = () => {};

const asyncNullFunction = async () => null;
const asyncEmptyStr = async () => "";
const asyncFalseFunction = async () => false;
const asyncSuccessFunction = async () => ({ success: true });
const asyncVoidFunction = async () => {};

const defaultWindow: ContextBridgeType["UtilitiesForPC"] = {
  hasInternetConnection: async () => true,
  notifyLoginStatus: voidFunction,
  readClipboard: asyncEmptyStr,
  setClipboard: voidFunction,
  turnOffComputer: asyncFalseFunction,
  restartComputer: asyncFalseFunction,
  setData: voidFunction,
  saveData: asyncSuccessFunction,
  loadData: asyncNullFunction,
  isElectronBuild: asyncFalseFunction,
  removeData: asyncFalseFunction,
  sendNotification: voidFunction,
  getNativeData: async () => "unknown",
  executeCommand: asyncEmptyStr,
  createPdf: asyncNullFunction,
  getClipboardHistory: async () => [],
  setClipboardHistory: asyncVoidFunction,
  hideClipboardWindow: voidFunction,
  onClipboardItemsUpdated: voidFunction,
  showClipboardWindow: voidFunction,
  authenticate: asyncFalseFunction,
  copyFileToTemp: asyncSuccessFunction,
  removeFile: asyncSuccessFunction,
  getSafeFolder: async () => "unknown",
  pickFolder: async () => "canceled",
  encryptFiles: asyncSuccessFunction,
  renameVaultItem: asyncSuccessFunction,
  loadEncryptedFiles: async () => [],
  actionWithVaultItem: asyncSuccessFunction,
  getFileInfo: async () => null,
  clearDecryptedFolderDirectory: asyncVoidFunction,
  askPath: asyncNullFunction,
  zipFolder: async (_1, _2, _3, _4, onError) =>
    onError?.(new Error("Not implemented")) || "",
  deleteFolderVault: asyncVoidFunction,
  renameFolderVault: asyncVoidFunction,
  getExistingVaultFolders: async () => [],
};

const windowModule: ContextBridgeType["UtilitiesForPC"] = !REPLACERS.isWeb
  ? defaultWindow
  : (window as unknown as ContextBridgeType).UtilitiesForPC || defaultWindow;

export { windowModule };
