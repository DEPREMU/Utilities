import {
  URI_EXTENSION,
  EXTENSION_ENCRYPTED,
  getMimeTypeFromExtension,
} from "@common";
import {
  ZipFile,
  FileInfo,
  UnzipFile,
  FolderFiles,
  HasPasswordZIP,
  GetDecryptedFolderDirectory,
  ClearDecryptedFolderDirectory,
} from "@types";
import * as ZIP from "react-native-zip-archive";
import * as FileSystem from "@dr.pogodin/react-native-fs";
import * as ExpoFileSystem from "expo-file-system";
import NativeFunctionsModule from "../modules/NativeFunctionsModule";
import { logError, loadDataStorage, sanitizeFileName } from "../functions";
import { FetchFileInfo, DecryptFolderFiles, ActionWithVaultItem } from "@types";

type ProgressCallback = (percentage: number) => void;

export const getDecryptedFolderDirectory: GetDecryptedFolderDirectory = () => {
  return new ExpoFileSystem.Directory(ExpoFileSystem.Paths.cache, "decrypted");
};

export const clearDecryptedFolderDirectory: ClearDecryptedFolderDirectory =
  async () => {
    const outputDir = getDecryptedFolderDirectory();

    try {
      if (!outputDir.exists) return;

      outputDir.delete();
    } catch (error) {
      logError(
        "DECRYPT",
        "Error clearing decrypted folder directory:",
        error instanceof Error ? error.message : error,
      );
    }
  };

export const encryptFile = async (
  inputPath: string,
  outputPath: string,
  password: string,
  onProgress?: ProgressCallback,
): Promise<boolean> => {
  if (inputPath.startsWith(URI_EXTENSION))
    inputPath = inputPath.slice(URI_EXTENSION.length);
  if (outputPath.startsWith(URI_EXTENSION))
    outputPath = outputPath.slice(URI_EXTENSION.length);

  inputPath = decodeURIComponent(inputPath);
  outputPath = decodeURIComponent(outputPath);

  let remove = () => {};

  try {
    if (!(await FileSystem.exists(inputPath))) return false;

    if (onProgress) {
      remove = NativeFunctionsModule.subscribeToProgressEncrypt((per, uri) => {
        const cleanUri = uri.startsWith(URI_EXTENSION)
          ? uri.slice(URI_EXTENSION.length)
          : uri;
        const cleanInput = inputPath.startsWith(URI_EXTENSION)
          ? inputPath.slice(URI_EXTENSION.length)
          : inputPath;

        if (decodeURIComponent(cleanUri) === decodeURIComponent(cleanInput)) {
          onProgress(per);
        }
      });
    }

    const success = await NativeFunctionsModule.encryptFile(
      inputPath,
      outputPath,
      password,
    );
    remove();

    return success;
  } catch (error) {
    remove();
    logError(
      "ENCRYPT",
      "Encryption failed:",
      error instanceof Error ? error.message : error,
    );
    try {
      if (await FileSystem.exists(outputPath))
        await FileSystem.unlink(outputPath);
    } catch {
      // Ignore errors during cleanup
    }
    return false;
  }
};

export const decryptFile = async (
  inputPath: string,
  outputPath: string,
  password: string,
  onProgress?: ProgressCallback,
): Promise<boolean> => {
  if (inputPath.startsWith(URI_EXTENSION))
    inputPath = inputPath.slice(URI_EXTENSION.length);
  if (outputPath.startsWith(URI_EXTENSION))
    outputPath = outputPath.slice(URI_EXTENSION.length);

  inputPath = decodeURIComponent(inputPath);
  outputPath = decodeURIComponent(outputPath);

  let remove = () => {};

  try {
    const [inputExists, outputExists] = await Promise.all([
      FileSystem.exists(inputPath),
      FileSystem.exists(outputPath),
    ]);

    if (!inputExists) {
      if (outputExists) await FileSystem.unlink(outputPath);
      return false;
    }
    if (outputExists) return true;

    if (onProgress) {
      remove = NativeFunctionsModule.subscribeToProgressEncrypt((per, uri) => {
        const cleanUri = uri.startsWith(URI_EXTENSION)
          ? uri.slice(URI_EXTENSION.length)
          : uri;
        const cleanInput = inputPath.startsWith(URI_EXTENSION)
          ? inputPath.slice(URI_EXTENSION.length)
          : inputPath;

        if (decodeURIComponent(cleanUri) === decodeURIComponent(cleanInput)) {
          onProgress(per);
        }
      });
    }

    const success = await NativeFunctionsModule.decryptFile(
      inputPath,
      outputPath,
      password,
    );
    remove();

    return success;
  } catch (error) {
    remove();
    logError("DECRYPT", "Decryption failed:", (error as Error).message);
    if (await FileSystem.exists(outputPath)) FileSystem.unlink(outputPath);

    return false;
  }
};

export const decryptFolderFiles: DecryptFolderFiles = async (
  folder,
  password,
  onDecryptedFile,
) => {
  if (folder.startsWith(URI_EXTENSION))
    folder = folder.slice(URI_EXTENSION.length);

  try {
    const files = await FileSystem.readDir(folder);

    const outputDir = getDecryptedFolderDirectory();

    try {
      if (!outputDir.exists)
        outputDir.create({
          idempotent: true,
          intermediates: true,
        });
    } catch {
      // Ignore errors
    }

    const decryptedFiles: FolderFiles = [];

    for (const file of files) {
      if (!file.isFile()) continue;

      const finalFilename = sanitizeFileName(file.name.replace(/\.enc$/, ""));

      const fileDecrypted: FolderFiles[number] = {
        uri: "",
        size: file.size,
        name: finalFilename,
        mimeType: getMimeTypeFromExtension(
          finalFilename.split(".").pop() || "",
        ),
        originalUri: "",
      };

      try {
        const expoFile = new ExpoFileSystem.File(
          URI_EXTENSION + folder,
          file.name,
        );
        fileDecrypted.originalUri = expoFile.uri;
      } catch {
        continue;
      }

      try {
        const outputPath = new ExpoFileSystem.File(outputDir, finalFilename)
          .uri;

        const success = await decryptFile(
          fileDecrypted.originalUri,
          outputPath,
          password,
        );

        if (!success) continue;

        fileDecrypted.uri = outputPath;

        decryptedFiles.push(fileDecrypted);
        if (onDecryptedFile) onDecryptedFile(fileDecrypted);

        await new Promise((r) => setTimeout(r, 10));
      } catch (error) {
        logError(
          "DECRYPT",
          `Error decrypting file ${file.name}:`,
          error instanceof Error ? error.message : error,
        );
        continue;
      }
    }

    return decryptedFiles.filter((f): f is FolderFiles[number] => !!f);
  } catch (error) {
    logError(
      "DECRYPT",
      "Error decrypting folder files:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
};

export const actionWithVaultItem: ActionWithVaultItem = async (
  action,
  item,
  targetFolderId,
) => {
  try {
    const directory = await loadDataStorage("VAULT_DIRECTORY", "");

    const targetDir = new ExpoFileSystem.Directory(directory, targetFolderId);
    try {
      if (!targetDir.exists)
        targetDir.create({
          idempotent: true,
          intermediates: true,
        });
    } catch {
      return { success: false, error: "Failed to create target folder." };
    }

    const oldFile = new ExpoFileSystem.File(item.originalUri);
    const newFile = new ExpoFileSystem.File(targetDir, item.name);

    if (action === "copy") oldFile.copy(newFile);
    else if (action === "move") oldFile.move(newFile);
    else return { success: false, error: "Invalid action." };

    return { success: true };
  } catch (error) {
    logError(
      "ACTION_VAULT_ITEM",
      `Error performing ${action} on vault item:`,
      error instanceof Error ? error.message : error,
    );
    return { success: false, error: "An error occurred." };
  }
};

export const renameVaultItem = async (
  item: FolderFiles[number],
  newName: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const file = new ExpoFileSystem.File(item.originalUri);
    file.rename(newName + EXTENSION_ENCRYPTED);

    return { success: true };
  } catch (error) {
    logError(
      "RENAME_VAULT_ITEM",
      `Error renaming vault item:`,
      error instanceof Error ? error.message : error,
    );
    return { success: false, error: "An error occurred." };
  }
};

export const fetchFileInfo: FetchFileInfo = async (uri) => {
  try {
    const fileInfo = new ExpoFileSystem.File(uri).info();

    if (!fileInfo.exists) return null;

    const name = uri.split("/").pop() || "";
    const mimeType = getMimeTypeFromExtension(uri.split(".").pop() || "");

    const info: FileInfo = {
      size: fileInfo.size || 0,
      ...(mimeType ? { mimeType } : {}),
      createdAt: fileInfo.creationTime
        ? new Date(fileInfo.creationTime)
        : new Date(),
      modifiedAt: fileInfo.modificationTime
        ? new Date(fileInfo.modificationTime)
        : new Date(),
      uri,
      name,
      extension: name.includes(".") ? name.split(".").pop() || "" : "",
    };

    return info;
  } catch {
    return null;
  }
};

export const hasPasswordZIP: HasPasswordZIP = async (zipPath) => {
  try {
    return await ZIP.isPasswordProtected(zipPath);
  } catch (error) {
    logError(
      "ZIP_INFO",
      "Error checking if ZIP has password:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
};

export const zipFile: ZipFile = async (files, onProgress, password, onZip) => {
  const tempDir = new ExpoFileSystem.Directory(
    ExpoFileSystem.Paths.cache,
    "temp_zip",
  );

  try {
    if (!tempDir.exists)
      tempDir.create({
        idempotent: true,
        intermediates: true,
      });
  } catch {
    // Ignore errors
  }

  files = files
    .map((f) => {
      try {
        const file = new ExpoFileSystem.File(f);
        const destFile = new ExpoFileSystem.File(tempDir, file.name);

        const destUri = destFile.uri.startsWith(URI_EXTENSION)
          ? destFile.uri.slice(URI_EXTENSION.length)
          : destFile.uri;

        if (destFile.exists) return destUri;
        file.copy(destFile);

        return destUri;
      } catch (error) {
        logError(
          "VAULT",
          `Error copying file ${f} to temp directory:`,
          error instanceof Error ? error.message : error,
        );
        return null;
      }
    })
    .filter((f): f is string => !!f);

  const sub = ZIP.subscribe(({ progress }) => {
    onProgress(progress);
  });

  const source = decodeURIComponent(
    tempDir.uri.startsWith(URI_EXTENSION)
      ? tempDir.uri.slice(URI_EXTENSION.length)
      : tempDir.uri,
  );
  const zip = new ExpoFileSystem.File(ExpoFileSystem.Paths.cache, "temp.zip")
    .uri;

  const outputPath = decodeURIComponent(
    zip.startsWith(URI_EXTENSION) ? zip.slice(URI_EXTENSION.length) : zip,
  );

  try {
    let path = "";
    if (password)
      path = await ZIP.zipWithPassword(source, outputPath, password);
    else path = await ZIP.zip(source, outputPath);

    path = path.startsWith(URI_EXTENSION) ? path : URI_EXTENSION + path;

    onZip?.(path, () => {
      try {
        new ExpoFileSystem.File(path).delete();
      } catch {
        // Ignore errors
      }
    });

    try {
      sub.remove();
      tempDir.delete();
    } catch {
      // Ignore errors
    }

    return path;
  } catch (error) {
    logError(
      "VAULT",
      "Error getting ZIP file list:",
      error instanceof Error ? error.message : error,
    );
    return "";
  }
};

export const unzipFile: UnzipFile = async (
  zipPath,
  outputFolderPath,
  onPasswordRequired?,
) => {
  try {
    zipPath = decodeURIComponent(zipPath);
    outputFolderPath = decodeURIComponent(outputFolderPath);

    zipPath = zipPath.startsWith(URI_EXTENSION)
      ? zipPath.slice(URI_EXTENSION.length)
      : zipPath;
    outputFolderPath = outputFolderPath.startsWith(URI_EXTENSION)
      ? outputFolderPath.slice(URI_EXTENSION.length)
      : outputFolderPath;

    const isProtected = await ZIP.isPasswordProtected(zipPath);
    let password: string | undefined | null;
    if (isProtected) {
      password = await onPasswordRequired?.();
      if (!password) return [];
    }

    let extractedPath = "";
    if (password)
      extractedPath = await ZIP.unzipWithPassword(
        zipPath,
        outputFolderPath,
        password,
      );
    else extractedPath = await ZIP.unzip(zipPath, outputFolderPath);

    const files = new ExpoFileSystem.Directory(extractedPath).list();
    return files.map((f) => f.uri);
  } catch (error) {
    logError(
      "UNZIP_LIST",
      "Error getting UNZIP file list:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
};
