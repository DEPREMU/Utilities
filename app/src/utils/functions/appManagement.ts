import {
  AlbumsImages,
  ReturnSelectImage,
  DownloadableMimeType,
  RequestChangeImageFormat,
} from "@types";
import axios from "axios";
import React from "react";
import isEqual from "react-fast-compare";
import { logger } from "./debug";
import { tTyped } from "../translates";
import * as Sharing from "expo-sharing";
import { REPLACERS } from "../TOP_LEVEL";
import { Alert, Falsy } from "react-native";
import _BackgroundTimer from "react-native-background-timer";
import { fetchToServer } from "./APIManagement";
import * as Localization from "expo-localization";
import * as MediaLibrary from "expo-media-library";
import { stringifyData } from "../services/storage";
import * as DocumentPicker from "expo-document-picker";
import { wrapFunctionWithError } from "@common";
import { Directory, File, Paths } from "expo-file-system";

const URL_GOOGLE_204 = "https://www.google.com/generate_204";

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
 * Capitalizes the first letter of a string.
 *
 * @param str - The string to capitalize.
 * @returns The string with the first letter capitalized, or the original string if it is empty.
 */
export const capitalize = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const setTimeoutPolyfill = (
  fn: (...args: unknown[]) => void,
  timeout: number,
): number => {
  if (REPLACERS.isNative) return _BackgroundTimer.setTimeout(fn, timeout);
  else return setTimeout(fn, timeout);
};

export const clearTimeoutPolyfill = (
  ...ids: (number | Falsy | React.RefObject<number | Falsy>)[]
): void => {
  ids.forEach((id) => {
    if (id && typeof id === "object" && "current" in id) {
      const ref = id;
      id = ref.current;
      ref.current = null;
    }

    if (!id) return;

    if (REPLACERS.isNative) _BackgroundTimer.clearTimeout(id as number);
    else clearTimeout(id);
  });
};

export const setIntervalPolyfill = (
  fn: (...args: unknown[]) => void,
  interval: number,
): number => {
  if (REPLACERS.isNative) return _BackgroundTimer.setInterval(fn, interval);
  else return setInterval(fn, interval);
};

export const clearIntervalPolyfill = (
  ...ids: (number | Falsy | React.RefObject<number | Falsy>)[]
): void => {
  ids.forEach((id) => {
    if (id && typeof id === "object" && "current" in id) {
      const ref = id;
      id = ref.current;
      ref.current = null;
    }

    if (!id) return;

    if (REPLACERS.isNative) _BackgroundTimer.clearInterval(id);
    else clearInterval(id);
  });
};

export const checkUrlStatus = async (
  url: string,
  method?: "get" | "post",
  timeout?: number,
): Promise<boolean> => {
  try {
    if (!method) method = "get";
    if (!timeout) timeout = 3000;

    const res = await axios.request<{ destroy?: () => void }>({
      url,
      method,
      timeout,
      data: method === "post" ? {} : undefined,
      validateStatus: () => true,
    });
    res?.data?.destroy?.();
    return res.status >= 200 && res.status < 400;
  } catch (error) {
    logger.error(
      `Error checking URL status for ${url}:`,
      error instanceof Error ? error.message : error,
    );
    return false;
  }
};

/**
 * Checks if the device has an active internet connection by attempting to reach a Google server.
 *
 * This function performs a GET request to a predefined Google server URL with a 10-second timeout.
 * It considers the connection active if the request returns a status code in the range of 200-399.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the internet connection is verified, or `false` if the request fails or times out.
 */
export const hasInternetConnection = async (): Promise<boolean> => {
  try {
    const res = await axios.get(URL_GOOGLE_204, { timeout: 10000 });
    return res.status < 400 && res.status >= 200;
  } catch {
    return false;
  }
};

export const waitForTime = (ms: number) => {
  return new Promise((resolve) => setTimeoutPolyfill(resolve, ms));
};

/**
 * Waits for an active internet connection by repeatedly checking connectivity with a specified number of retries and interval.
 * The function attempts to verify the internet connection by calling `hasInternetConnection` at regular intervals until a connection is established or the maximum number of retries is reached.
 *
 * @param retries - The maximum number of attempts to check for an internet connection before giving up.
 * @param interval - The time in milliseconds to wait between each connectivity check. Default is 2000ms (2 seconds).
 * @returns A promise that resolves to `true` if an internet connection is established within the given retries, or `false` if all attempts fail.
 */
export const waitForInternet = async (
  retries: number,
  interval: number = 2000,
): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    if (await hasInternetConnection()) return true;
    await waitForTime(interval);
  }
  return false;
};

/**
 * Checks whether the server is reachable by requesting a lightweight health-check endpoint.
 *
 * Sends a request to `"/generate204"` and returns `true` when the response is successful
 * (`Response.ok`), otherwise returns `false`.
 *
 * If the request throws, the error is logged and `false` is returned.
 *
 * @returns A promise that resolves to `true` if the server responds successfully; otherwise `false`.
 */
export const isServerAlive = async (): Promise<boolean> => {
  try {
    const res = await fetchToServer("/generate204");
    return res.ok;
  } catch (error) {
    logger.error(
      "Error checking server status:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
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
      return stringifyData(values[0]) === stringifyData(values[1]);
    return isEqual(values[0], values[1]);
  } else {
    const stringifiedValue = useStringify ? stringifyData(values[0]) : null;
    for (let i = 1; i < values.length; i++) {
      if (useStringify) {
        if (stringifiedValue !== stringifyData(values[i])) return false;
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
      copyToCacheDirectory: true,
      ...(settings || {}),
    });

    if (!result.canceled)
      return await Promise.all(
        result.assets.map(async (asset) => {
          let base64: string | undefined;
          if (asset.base64) base64 = asset.base64;
          else if (settings?.base64) {
            const fileData = new File(asset.uri);
            base64 = await fileData.base64();
          }

          return {
            uri: asset.uri,
            name: asset.name,
            size: asset.size || 0,
            type:
              (asset.mimeType?.split(
                "/",
              )[1] as RequestChangeImageFormat["format"]) || "png",
            ...(base64 ? { base64 } : {}),
          };
        }),
      );

    logger.log("Image selection was canceled.");
  } catch (error) {
    logger.error("Error selecting image:", error);
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

    wrapFunctionWithError(
      async () => {
        file.create({
          overwrite: true,
          intermediates: true,
        });
      },
      async (_, errMsg) => logger.error("Error creating file:", errMsg),
    );
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
          logger.error("Error saving file:", errMsg);
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

    const asset = await MediaLibrary.createAssetAsync(file.uri);
    const album = await MediaLibrary.getAlbumAsync(options.albumName);

    if (!album)
      await MediaLibrary.createAlbumAsync(options.albumName, asset, false);
    else await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);

    Alert.alert(
      tTyped("images.imageDownloadedInAlbumAlertTitle"),
      tTyped("images.imageDownloadedInAlbumAlertMessage", {
        albumName: options.albumName,
      }),
    );
  } catch (error) {
    logger.error("Error downloading image:", error);
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
