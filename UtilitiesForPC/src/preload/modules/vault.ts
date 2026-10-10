import { sendLog } from "../utils/logger";
import { sendMessage } from "../utils/sendMessage";
import { VaultBridge, PickedFile, FolderFiles } from "@types";

export const vaultBridge: VaultBridge = {
  authenticate: async (): Promise<boolean> => {
    try {
      return await sendMessage("invoke", "vault.authenticate");
    } catch (error) {
      sendLog("error", "Error during authentication:", error);
      return false;
    }
  },
  encryptFiles: async (
    files: PickedFile[],
    password: string,
    folderId: string,
  ) => {
    try {
      return await sendMessage(
        "invoke",
        "vault.encryptFiles",
        files,
        password,
        folderId,
      );
    } catch (error) {
      sendLog("error", "Error encrypting vault items:", error);
      return { success: false };
    }
  },
  loadEncryptedFiles: async (
    folderId: string,
    password: string,
  ): Promise<FolderFiles> => {
    try {
      return await sendMessage(
        "invoke",
        "vault.loadEncryptedFiles",
        folderId,
        password,
      );
    } catch (error) {
      sendLog("error", "Error loading encrypted files:", error);
      return [];
    }
  },
  actionWithItem: async (
    action: "copy" | "move",
    item: FolderFiles[number],
    targetFolderId: string,
  ) => {
    try {
      return await sendMessage(
        "invoke",
        "vault.actionWithItem",
        action,
        item,
        targetFolderId,
      );
    } catch (error) {
      sendLog("error", "Error performing action with vault item:", error);
      return { success: false };
    }
  },
  renameItem: async (item: FolderFiles[number], newName: string) => {
    try {
      return await sendMessage("invoke", "vault.renameItem", item, newName);
    } catch (error) {
      sendLog("error", "Error renaming vault item:", error);
      return { success: false };
    }
  },
  deleteFolder: async (folderId: string): Promise<void> => {
    try {
      await sendMessage("invoke", "vault.deleteFolder", folderId);
    } catch (error) {
      sendLog("error", "Error deleting folder vault:", error);
    }
  },
  renameFolder: async (
    oldFolderId: string,
    newFolderId: string,
  ): Promise<void> => {
    try {
      await sendMessage(
        "invoke",
        "vault.renameFolder",
        oldFolderId,
        newFolderId,
      );
    } catch (error) {
      sendLog("error", "Error renaming folder vault:", error);
    }
  },
  getExistingFolders: async (): Promise<string[]> => {
    try {
      return await sendMessage("invoke", "vault.getExistingFolders");
    } catch (error) {
      sendLog("error", "Error getting existing vault folders:", error);
      return [];
    }
  },
  getSafeFolder: async (): Promise<string> => {
    try {
      return await sendMessage("invoke", "vault.getSafeFolder");
    } catch (error) {
      sendLog("error", "Error getting safe folder:", error);
      return "unknown";
    }
  },
  clearDecryptedFolder: async (): Promise<void> => {
    try {
      await sendMessage("send", "vault.clearDecryptedFolder");
    } catch (error) {
      sendLog("error", "Error clearing decrypted folder directory:", error);
    }
  },
};
