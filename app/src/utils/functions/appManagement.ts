import {
  AlbumsImages,
  ReturnSelectImage,
  DownloadableMimeType,
  RequestChangeImageFormat,
} from "@types";
import React from "react";
import isEqual from "react-fast-compare";
import { Alert } from "react-native";
import { tTyped } from "../translates";
import * as Sharing from "expo-sharing";
import { REPLACERS } from "@common";
import * as Localization from "expo-localization";
import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import { Helper, wrapFunctionWithError } from "@common";

export const getFormattedDate = (
  date: Date,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (!locale) {
    const locales = Localization.getLocales()[0];
    locale = locales.languageTag || "es-MX";
  }
  if (!options)
    options = {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: Localization.getCalendars()[0]?.timeZone || undefined,
    };

  return new Intl.DateTimeFormat(locale, options).format(date);
};

/**
 * Verifies if a specified amount of time has elapsed since a given timestamp.
 * Calculates the elapsed time by comparing the current time with the provided timestamp and checks if it meets or exceeds the specified duration.
 *
 * @param time - The starting timestamp in milliseconds since the Unix epoch.
 * @param compare - The duration in milliseconds to compare against the elapsed time.
 * @returns An object containing:
 *          - `elapsed`: The total elapsed time in milliseconds since the provided timestamp.
 *          - `hasElapsed`: A boolean indicating whether the elapsed time is greater than or equal to the specified duration.
 *
 * @example
 * const time = Date.now();
 * await waitForTime(2000); // Wait for 2 seconds
 * const result = elapsedTime(time, 3000);
 * console.log(result); // { elapsed: 2000, hasElapsed: false, remaining: 1000 }
 */
export const elapsedTime = (
  time: number,
  compare: number,
): { elapsed: number; hasElapsed: boolean; remaining: number } => {
  const currentTime = Date.now();
  const elapsed = currentTime - time;
  const remaining = Math.max(0, compare - elapsed);

  return {
    elapsed,
    hasElapsed: elapsed >= compare,
    remaining,
  };
};

/**
 * Creates a deeply memoized version of a React functional component.
 *
 * This function wraps a React functional component with `React.memo` using deep equality comparison
 * via the `isEqual` function, preventing unnecessary re-renders when props have the same values
 * but different references.
 *
 * @template P - The props type of the component, must extend object
 * @param Component - The React functional component to memoize
 * @returns A memoized version of the component that uses deep equality comparison for props
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const memoDeep = <P extends React.FC<any>>(Component: P): P =>
  React.memo(Component, isEqual) as unknown as P;

/**
 * Compares multiple values for equality using either JSON stringification or deep equality check.
 *
 * @param useStringify - When true, compares values using JSON stringification; when false, uses deep equality comparison via isEqual
 * @param values - Variable number of values to compare for equality
 * @returns True if all values are equal, false otherwise. Returns true if fewer than 2 values are provided
 *
 * @remarks
 * - If fewer than 2 values are provided, returns true by default
 * - For 2 values, performs a direct comparison
 * - For 3 or more values, compares each subsequent value against the first value
 * - When using stringify mode, values are compared as JSON strings
 * - When not using stringify mode, values are compared using the isEqual function for deep equality
 *
 * @example
 * ```typescript
 * areEqualValues(true, {a: 1}, {a: 1}, {a: 1}); // true
 * areEqualValues(false, [1, 2], [1, 2]); // true
 * areEqualValues(false, [2, 1], [1, 2]); // false
 * areEqualValues(true, [1, 2], [1, 2]); // true
 * areEqualValues(true, [2, 1], [1, 2]); // true
 * areEqualValues(true, "hello", "world"); // false
 * ```
 */
export const areEqualValues = (
  useStringify: boolean,
  ...values: unknown[]
): boolean => {
  if (values.length < 2) return true;

  if (values.length < 3) {
    if (useStringify)
      return (
        Helper.JSON.stringifyData(values[0]) ===
        Helper.JSON.stringifyData(values[1])
      );
    return isEqual(values[0], values[1]);
  } else {
    const stringifiedValue = useStringify
      ? Helper.JSON.stringifyData(values[0])
      : null;
    for (let i = 1; i < values.length; i++) {
      if (useStringify) {
        if (stringifiedValue !== Helper.JSON.stringifyData(values[i]))
          return false;
      } else {
        if (!isEqual(values[0], values[i])) return false;
      }
    }
  }
  return true;
};

/**
 * Opens a document picker to select one or more image files.
 *
 * @param settings - Optional configuration for the document picker. Can include custom options
 *                   and a `base64` flag to request base64 encoding of selected images.
 * @returns A promise that resolves to either:
 *          - An array of selected image objects containing uri, name, size, type, and optionally base64 data
 *          - An object with `canceled: true` if the selection was canceled or an error occurred
 *
 * @remarks
 * - Automatically filters for image files only
 * - Copies selected files to cache directory by default
 * - If base64 encoding is requested but not provided by the picker, manually reads and encodes the file
 * - Returns `canceled: true` if user cancels selection or an error occurs
 * - Logs informational messages on cancellation and errors on failure
 */
export const selectImage = async (
  settings?: DocumentPicker.DocumentPickerOptions,
): Promise<ReturnSelectImage> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      ...(settings || {}),
    });

    if (!result.canceled)
      return await Promise.all(
        result.assets.map(async (asset) => {
          const image: Exclude<ReturnSelectImage, { canceled: true }>[number] =
            {
              uri: asset.uri,
              name: asset.name,
              size: asset.size || 0,
              type:
                (asset.mimeType?.split(
                  "/",
                )[1] as RequestChangeImageFormat["format"]) || "png",
            };

          if (asset.base64) image.base64 = asset.base64;
          else if (settings?.base64) {
            const fileData = new File(asset.uri);
            image.base64 = await fileData.base64();
            if (image.size === 0) image.size = fileData.size;
          }

          return image;
        }),
      );

    REPLACERS.Logger.log("Image selection was canceled.");
  } catch (error) {
    REPLACERS.Logger.error("Error selecting image:", error);
  }
  return { canceled: true };
};

/**
 * Requests media library permissions from the user.
 *
 * Displays an alert with localized messages if permission is denied.
 *
 * @returns A promise that resolves to `true` if permission is granted, `false` otherwise.
 */
const askMediaLibraryPermissions = async (): Promise<boolean> => {
  const MediaLibrary = await import("expo-media-library");

  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      tTyped("images.permissionRequiredTitle"),
      tTyped("images.permissionRequiredMessage"),
    );
    return false;
  }
  return true;
};

type OptionsDownloadFile = {
  uri: string;
  fileName: string;
  isImage?: boolean;
  typeFile: DownloadableMimeType;
  directory: "images" | "videos" | "audios" | "documents";
  albumName?: AlbumsImages;
  deleteAfterDownload?: boolean;
};

/**
 * Downloads a base64-encoded image as a file in a web browser.
 *
 * @param base64 - The base64-encoded string representing the file data. Can include the data URI prefix (e.g., "data:image/png;base64,") or be raw base64 data.
 * @param fileName - The desired name for the downloaded file.
 *
 * @remarks
 * This function creates a temporary anchor element, converts the base64 data to a Blob,
 * and triggers a download. The anchor element is automatically removed after the download starts.
 * The Blob is created with MIME type "image/png".
 */
const downloadBase64Web = async (options: OptionsDownloadFile) => {
  const base64Data = options.uri.includes("base64,")
    ? options.uri.split("base64,")[1]
    : options.uri;

  const binary = atob(base64Data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([array], { type: options.typeFile || "text/plain" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = options.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Downloads and saves a base64-encoded image to the device's media library or shares it.
 *
 * @param imageUri - The base64-encoded image URI. Can include the "base64," prefix or be raw base64 data.
 * @param fileName - The name to use when saving the file.
 * @param albumName - Optional. The album name where the image should be saved. If not provided,
 *                    the function will attempt to share the image instead. Defaults to "UtilitiesApp"
 *                    if sharing is not available.
 *
 * @returns A promise that resolves when the download/share operation completes.
 *
 * @remarks
 * This function performs the following steps:
 * 1. Extracts base64 data from the URI
 * 2. Creates a temporary directory and file in the cache
 * 3. Writes the base64 data to the file
 * 4. If no album is specified and sharing is available, shares the image
 * 5. Otherwise, requests media library permissions and saves to the specified album
 * 6. Displays success or error alerts to the user
 *
 * @throws Will log errors but won't throw them. Instead, displays error alerts to the user.
 */
const downloadBase64Native = async (options: OptionsDownloadFile) => {
  try {
    const base64 = options.uri.includes("base64,")
      ? options.uri.split("base64,")[1]
      : options.uri;

    const destination = new Directory(Paths.cache, options.directory);
    wrapFunctionWithError(async () => {
      destination.create({
        idempotent: true,
        intermediates: true,
      });
    });

    const file = new File(destination, options.fileName);

    try {
      file.create({
        overwrite: true,
        intermediates: true,
      });
    } catch (error) {
      REPLACERS.Logger.error("Error creating file:", error);
    }
    file.write(base64, { encoding: "base64" });

    if (
      (!options.albumName || !options.isImage) &&
      (await Sharing.isAvailableAsync())
    ) {
      await Sharing.shareAsync(file.uri);
      wrapFunctionWithError(async () => {
        if (options.deleteAfterDownload) file.delete();
      });
      return;
    }

    if (!options.isImage) {
      const destCache = new Directory(Paths.cache, options.directory);
      const destFile = new File(destCache, options.fileName);

      wrapFunctionWithError(async () => {
        destFile.create({
          overwrite: true,
          intermediates: true,
        });
      });
      destFile.write(base64, { encoding: "base64" });

      const { success, uri } = await wrapFunctionWithError(
        async () => {
          const directory = await Directory.pickDirectoryAsync();
          if (!directory)
            return {
              success: false,
              uri: tTyped("labels.noDirectorySelected"),
            };

          const newFile = directory.createFile(
            options.fileName,
            options.typeFile,
          );

          newFile.write(base64, { encoding: "base64" });

          if (options.deleteAfterDownload) destFile.delete();
          return { success: true, uri: directory.uri.split("//")[1] };
        },
        async (_, errMsg) => {
          REPLACERS.Logger.error("Error saving file:", errMsg);
          return { success: false, uri: tTyped("labels.noDirectorySelected") };
        },
      );

      Alert.alert(
        tTyped(
          success
            ? "labels.fileSavedSuccessTitle"
            : "labels.fileNotSavedErrorTitle",
        ),
        tTyped(
          success
            ? "labels.fileSavedSuccessMessage"
            : "labels.fileNotSavedErrorMessage",
          {
            filename: options.fileName,
            filePath: uri,
          },
        ),
      );

      return;
    }

    const hasPermission = await askMediaLibraryPermissions();
    if (!hasPermission) return;

    options.albumName = options.albumName || "UtilitiesApp";

    const MediaLibrary = await import("expo-media-library");

    const asset = await MediaLibrary.Asset.create(file.uri);
    const album = await MediaLibrary.Album.get(options.albumName);

    if (!album)
      await MediaLibrary.Album.create(options.albumName, [asset], false);
    else await album.add([asset]);

    Alert.alert(
      tTyped("images.imageDownloadedInAlbumAlertTitle"),
      tTyped("images.imageDownloadedInAlbumAlertMessage", {
        albumName: options.albumName,
      }),
    );
  } catch (error) {
    REPLACERS.Logger.error("Error downloading image:", error);
    Alert.alert(
      tTyped("images.errorWhileSavingImageAlertTitle"),
      tTyped("images.errorWhileSavingImageAlertMessage", {
        imageName: options.fileName,
      }),
    );
  }
};

/**
 * Downloads a base64 encoded file using the appropriate platform-specific implementation.
 *
 * @remarks
 * This function uses platform detection to determine whether to use the web or native
 * implementation for downloading base64 content. On web platforms, it uses `downloadBase64Web`,
 * while on native platforms (iOS/Android), it uses `downloadBase64Native`.
 */
export const downloadBase64 = REPLACERS.isWeb
  ? downloadBase64Web
  : downloadBase64Native;

export const sanitizeFileName = (name: string) => {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, " ").trim();
};
