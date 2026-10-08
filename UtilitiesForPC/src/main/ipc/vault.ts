import {
  encryptFiles,
  decryptFiles,
  actionWithVaultItem,
  renameVaultItem,
  getStorageValue,
  saveStorageValue,
} from "../utils/storage";
import path from "path";
import { app } from "electron";
import { Logger } from "../utils/logger";
import { Directory, File } from "@common";
import { authenticateUser } from "../utils/vault";
import { IpcHandlersRecord } from "./types";

const logger = new Logger("IPC-Vault");

export const vaultIpcHandlers: IpcHandlersRecord<
  | "vault.authenticate"
  | "vault.encryptFiles"
  | "vault.loadEncryptedFiles"
  | "vault.actionWithItem"
  | "vault.renameItem"
  | "vault.deleteFolder"
  | "vault.renameFolder"
  | "vault.getExistingFolders"
  | "vault.getSafeFolder"
  | "vault.clearDecryptedFolder"
> = {
  "vault.authenticate": {
    type: "handle",
    func: async () => {
      logger.log("Received vault.authenticate request");
      return await authenticateUser();
    },
  },
  "vault.encryptFiles": {
    type: "handle",
    func: async (_event, ...args) => {
      logger.log("Received vault.encryptFiles request");
      return await encryptFiles(...args);
    },
  },
  "vault.loadEncryptedFiles": {
    type: "handle",
    func: async (_event, ...args) => {
      logger.log("Received vault.loadEncryptedFiles request");
      return await decryptFiles(...args);
    },
  },
  "vault.actionWithItem": {
    type: "handle",
    func: async (_event, ...args) => {
      logger.log("Received vault.actionWithItem request");
      const { success, error } = await actionWithVaultItem(...args);
      return { success, ...(error ? { error } : {}) };
    },
  },
  "vault.renameItem": {
    type: "handle",
    func: async (_event, ...args) => {
      logger.log("Received vault.renameItem request");
      const { success, error } = await renameVaultItem(...args);
      return { success, ...(error ? { error } : {}) };
    },
  },
  "vault.deleteFolder": {
    type: "handle",
    func: async (_event, folderId) => {
      logger.log(
        `Received vault.deleteFolder request for folderId: ${folderId}`,
      );
      const directory = await getStorageValue("VAULT_DIRECTORY");
      if (!directory) return;

      const folderPath = path.join(directory, folderId);
      const file = new File(folderPath);
      if (!(await file.exists())) return;

      await file.rm({ recursive: true, force: true });
      logger.log(`Deleted folder vault at ${folderPath}`);
    },
  },
  "vault.renameFolder": {
    type: "handle",
    func: async (_event, oldFolderId, newFolderId) => {
      logger.log(
        `Received vault.renameFolder request from ${oldFolderId} to ${newFolderId}`,
      );
      const directory = await getStorageValue("VAULT_DIRECTORY");
      if (!directory) return;

      const oldFolderPath = path.join(directory, oldFolderId);
      const newFolderPath = path.join(directory, newFolderId);

      const dir = new File(oldFolderPath);
      if (!(await dir.exists())) return;

      const success = await dir.rename(newFolderPath);
      if (success)
        logger.log(
          `Renamed folder vault from ${oldFolderPath} to ${newFolderPath}`,
        );
    },
  },
  "vault.getExistingFolders": {
    type: "handle",
    func: async () => {
      logger.log("Received vault.getExistingFolders request");
      const directory = await getStorageValue("VAULT_DIRECTORY");
      if (!directory) return [];

      try {
        const dir = new Directory(directory);
        const folderNames = await dir.readDir.withFileTypes();
        const existingFolders = folderNames
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);

        return existingFolders;
      } catch (error) {
        logger.error(
          `Error reading vault directories at ${directory}: `,
          error,
        );
        return [];
      }
    },
  },
  "vault.getSafeFolder": {
    type: "handle",
    func: async () => {
      try {
        let directory = app.getPath("documents");
        if (!directory) directory = app.getPath("appData");
        if (!directory) directory = app.getPath("userData");
        if (!directory) return "unknown";

        directory = path.join(directory, "UtilitiesForPCSafe");
        const dir = new Directory(directory);
        if (!(await dir.exists())) {
          await dir.mkdir({ recursive: true });
          if (!(await dir.exists())) return "unknown";
        }
        await saveStorageValue("VAULT_DIRECTORY", directory);

        return directory;
      } catch (error) {
        logger.error("Error getting safe folder path: ", error);
        return "unknown";
      }
    },
  },
  "vault.clearDecryptedFolder": {
    type: "on",
    func: async () => {
      logger.log("Received vault.clearDecryptedFolder request");
      const tempDir = path.join(
        app.getPath("temp"),
        "UtilitiesForPC",
        "decrypted",
      );

      const file = new File(tempDir);
      if (!(await file.exists())) return;

      await file.rm({ recursive: true, force: true });
      logger.log(`Cleared decrypted folder directory at ${tempDir}`);
    },
  },
};
