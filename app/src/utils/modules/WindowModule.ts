import { REPLACERS } from "../TOP_LEVEL";
import { ContextBridgeType } from "@types";

const voidFunction = () => {};
const nullFunction = async () => null;
const falseFunction = async () => false;
const successFunction = async () => ({ success: true });
const asyncVoidFunction = async () => {};

const defaultWindow: ContextBridgeType["UtilitiesForPC"] = {
  notifyLoginStatus: voidFunction,
  readClipboard: async () => "",
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
  createPdf: nullFunction,
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
  getExistingVaultFolders: async () => [],
};

const windowModule: ContextBridgeType["UtilitiesForPC"] = !REPLACERS.isWeb
  ? defaultWindow
  : (window as unknown as ContextBridgeType).UtilitiesForPC || defaultWindow;

export { windowModule };
