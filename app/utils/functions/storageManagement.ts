import {
  isSecureKey,
  ALL_KEYS_STORAGE,
  languagesSupported,
  SECURE_KEYS_STORAGE,
  ExpectedStorageTypes,
  wrapFunctionWithError,
  ALL_KEYS_STORAGE_TYPE,
  ALL_KEYS_STORAGE_KEYS,
  SECURE_KEYS_STORAGE_TYPE,
} from "@common";
import { isDev } from "../constants";
import { logError } from "./debug";
import { Platform } from "react-native";
import windowModule from "../modules/WindowModule";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Localization from "expo-localization";
import { reloadAppAsync } from "expo";
import { LanguagesSupported } from "@types";
import { parseData, stringifyData } from "./appManagement";

type SaveDataStorage = {
  <T extends ALL_KEYS_STORAGE_TYPE>(
    key: T,
    value: ExpectedStorageTypes<"BOTH">[T],
  ): Promise<void>;

  <T extends ALL_KEYS_STORAGE_TYPE, U extends unknown>(
    key: T,
    value: ExpectedStorageTypes<"BOTH">[T],
    errCallback: (err?: Error, errMsg?: string) => U,
  ): Promise<U>;
};

type LoadDataStorage = {
  <T extends ALL_KEYS_STORAGE_TYPE>(
    key: T,
  ): Promise<
    T extends "DEVICE_ID" ? string : ExpectedStorageTypes<"BOTH">[T] | null
  >;

  <
    T extends ALL_KEYS_STORAGE_TYPE,
    U extends ExpectedStorageTypes<"BOTH">[T],
    R = Exclude<ExpectedStorageTypes<"BOTH">[T], null | undefined>,
  >(
    key: T,
    fallbackValue: U,
  ): Promise<R | U>;

  <
    T extends ALL_KEYS_STORAGE_TYPE,
    V extends ExpectedStorageTypes<"BOTH">[T],
    R = unknown,
  >(
    key: T,
    func: (value: V, err?: Error, errMsg?: string) => R,
  ): Promise<R>;
};

type RemoveDataStorage = {
  <T extends ALL_KEYS_STORAGE_TYPE>(key: T): Promise<void>;

  <T extends ALL_KEYS_STORAGE_TYPE, R = unknown>(
    key: T,
    errCallback: (err?: Error, errMsg?: string) => R,
  ): Promise<R>;
};

/**
 * Saves data to storage based on the platform and key type.
 *
 * On native platforms (iOS/Android), uses SecureStore for secure keys and AsyncStorage for regular keys.
 * On web platforms, uses localStorage for development or Electron's storage API for production builds.
 *
 * @param key - The storage key under which to save the data
 * @param value - The value to be stored (will be stringified automatically)
 * @param args - Optional error callback function that receives (error: Error, errorMessage: string)
 *
 * @remarks
 * - Secure keys are automatically detected using `isSecureKey()`
 * - The `_deviceId` key cannot be saved on web platforms as it's managed by Electron
 * - In non-Electron web builds (development mode), falls back to localStorage
 * - Data is automatically stringified before storage using `stringifyData()`
 * - All errors are wrapped and handled by `wrapFunctionWithError()`
 *
 * @throws {Error} When attempting to save `_deviceId` on web platform
 * @throws {Error} When not running in an Electron build and not in development mode
 * @throws {Error} When Electron storage operation fails
 */
export const saveDataStorage: SaveDataStorage = wrapFunctionWithError(
  async (
    keyStorage: Parameters<SaveDataStorage>[0],
    value: Parameters<SaveDataStorage>[1],
    ...args: Parameters<SaveDataStorage>[2][]
  ) => {
    const key = ALL_KEYS_STORAGE[keyStorage];

    const returnType = (err?: Error, errMsg?: string) => {
      const errCallback = args?.[0];

      if (typeof errCallback !== "function") return;
      if (!err) return;

      return errCallback(err, errMsg) as void;
    };

    const stringifiedValue = stringifyData(value);

    if (Platform.OS !== "web") {
      if (isSecureKey(keyStorage))
        await SecureStore.setItemAsync(key, stringifiedValue);
      else await AsyncStorage.setItem(key, stringifiedValue);

      return returnType();
    }
    if (keyStorage === "DEVICE_ID") {
      const errMsg =
        "Cannot save device ID on web, this is managed automatically in electron";
      return returnType(new Error(errMsg), errMsg);
    }

    const isElectron = await windowModule.isElectronBuild();

    if (!isElectron && !isDev) throw new Error("Not an Electron build");
    else if (!isElectron) localStorage.setItem(key, stringifiedValue);
    else {
      const { success } = (await windowModule.saveData(
        keyStorage,
        stringifiedValue,
      )) || { success: false };

      if (success) return returnType();

      const errMsg = "Failed to save data in Electron build";
      return returnType(new Error(errMsg), errMsg);
    }
    return returnType();
  },
  true,
  (err, errMsg, keyStorage, ...args: unknown[]) => {
    if (keyStorage === "DEVICE_ID") throw new Error(errMsg);

    const errCallback = args?.[1]; // [value, errCallback]
    if (typeof errCallback === "function") return errCallback(err, errMsg);

    logError(`saveDataStorage("${keyStorage}") => ${errMsg}`);
  },
);

/**
 * Loads data from storage based on the platform and key type.
 *
 * @template T - The expected type of the returned data
 * @param {string} key - The storage key to retrieve data from. Can be a secure key or regular key.
 * @param {...any} args - Optional arguments:
 *   - A callback function `(value: parsedValue | null, err?: Error, errMsg?: string) => T` to handle the retrieved value
 *   - A fallback value to return if no data is found
 *
 * @returns {Promise<T | unknown>} The parsed data from storage, the result of the callback function,
 *   the fallback value, or null if an error occurs
 *
 * @throws {Error} Throws an error if running on web platform in production mode without Electron
 *
 * @remarks
 * - On native platforms (iOS/Android), uses AsyncStorage or SecureStore depending on the key type
 * - If the key is "DEVICE_ID" and no value is found, triggers an app reload
 * - On web platform, uses Electron's storage API in production or localStorage in development
 * - All retrieved values are parsed using the `parseData` function before being returned
 * - Errors are wrapped and handled by `wrapFunctionWithError`, with custom error handling logic
 */
export const loadDataStorage: LoadDataStorage = wrapFunctionWithError(
  async (
    keyStorage: Parameters<LoadDataStorage>[0],
    ...args: Parameters<LoadDataStorage>[1][]
  ) => {
    const key = ALL_KEYS_STORAGE[keyStorage];

    const returnValue = (value: unknown, err?: Error, errMsg?: string) => {
      const arg = args?.[0];
      if (typeof arg === "function") return arg(value as string, err, errMsg);

      if (!value && typeof arg !== "undefined") return arg;

      return value;
    };

    if (Platform.OS !== "web") {
      let value: string | null;
      if (isSecureKey(keyStorage)) value = await SecureStore.getItemAsync(key);
      else value = await AsyncStorage.getItem(key);

      const parsed = parseData(value);
      return returnValue(parsed);
    }

    let value: string | null = null;

    const isElectron = await windowModule.isElectronBuild();
    if (!isElectron && !isDev) throw new Error("Not an Electron build");
    else if (!isElectron) value = localStorage.getItem(key);
    else value = await windowModule.loadData(keyStorage);

    const parsedResponse = parseData(value);
    return returnValue(parsedResponse);
  },
  true,
  (err, errMsg, keyStorage, ...args: unknown[]) => {
    const arg = args?.[0]; // [fallbackValue | func]
    if (typeof arg === "function") return arg(null, err, errMsg);
    if (keyStorage === "DEVICE_ID") reloadAppAsync();

    logError(`loadDataStorage("${keyStorage}") => ${errMsg}`);
    if (typeof arg !== "undefined") return arg;
    return null;
  },
);

/**
 * Removes data from storage based on the platform and storage type.
 *
 * This function handles data removal across different platforms (native/web) and storage mechanisms
 * (SecureStore, AsyncStorage, localStorage, Electron storage). It includes validation to prevent
 * removal of protected keys and provides error handling through callbacks.
 *
 * @param key - The storage key to remove. Cannot be "DEVICE_ID" as it's protected from removal.
 * @param args - Optional error callback function that receives (error: Error, errorMessage: string) parameters.
 *
 * @remarks
 * - On native platforms, uses SecureStore for secure keys or AsyncStorage for regular keys
 * - On web platforms, uses localStorage (dev mode) or Electron's storage mechanism (production)
 * - The "DEVICE_ID" key is protected and cannot be removed
 * - The "TERMINAL_COMMANDS" key cannot be removed on web platforms
 * - Wrapped with error handling that logs errors or calls the provided error callback
 *
 * @throws {Error} When attempting to remove "DEVICE_ID" key
 * @throws {Error} When running on web in production mode without Electron build
 */
export const removeDataStorage: RemoveDataStorage = wrapFunctionWithError(
  async (
    keyStorage: Parameters<RemoveDataStorage>[0],
    ...args: Parameters<RemoveDataStorage>[1][]
  ) => {
    const key = ALL_KEYS_STORAGE[keyStorage];

    const returnType = (err?: Error, errMsg?: string) => {
      const callback = args?.[0];
      if (typeof callback !== "function") return;
      if (!err) return;

      return callback(err, errMsg) as void;
    };

    if (keyStorage === "DEVICE_ID") {
      const errMsg = "Cannot remove device ID from storage";
      return returnType(new Error(errMsg), errMsg);
    }
    if (Platform.OS === "web" && key === "TERMINAL_COMMANDS") {
      const errMsg = "Cannot remove terminal commands on web";
      return returnType(new Error(errMsg), errMsg);
    }

    if (Platform.OS !== "web") {
      if (isSecureKey(keyStorage)) await SecureStore.deleteItemAsync(key);
      else await AsyncStorage.removeItem(key);

      return returnType();
    }
    const isElectron = await windowModule.isElectronBuild();

    if (!isElectron && !isDev) throw new Error("Not an Electron build");
    else if (!isElectron) localStorage.removeItem(key);
    else await windowModule.removeData(keyStorage);

    return returnType();
  },
  true,
  (err, errMsg, keyStorage, ...args: unknown[]) => {
    if (keyStorage === "DEVICE_ID") throw new Error(errMsg);

    const errCallback = args?.[0];
    if (typeof errCallback === "function") return errCallback(err, errMsg);

    logError(`removeDataStorage("${keyStorage}") => ${errMsg}`);
  },
);

/**
 * Cleans all storage data from the application while preserving the device ID.
 *
 * This function handles storage cleanup differently based on the platform:
 * - **Web (Electron)**: Clears localStorage and removes all items from electron storage except `_deviceId`
 * - **Native (iOS/Android)**: Removes all secure store items except `_deviceId` and clears AsyncStorage
 *
 * @remarks
 * - On web platforms, the function only executes if running in an Electron environment
 * - The `_deviceId` key is explicitly preserved across all platforms
 * - Individual key deletion errors are silently ignored to ensure the cleanup process continues
 * - Any top-level errors are logged via `logError`
 *
 * @returns A promise that resolves when all storage cleanup operations are complete
 */
export const cleanAllStorageData = wrapFunctionWithError(
  async () => {
    if (Platform.OS === "web") {
      const isElectron = await windowModule.isElectronBuild();
      if (!isElectron) return;

      localStorage.clear();
      await Promise.all(
        ALL_KEYS_STORAGE_KEYS.map(
          wrapFunctionWithError(async (keyStorage) => {
            if (keyStorage === "DEVICE_ID") return;

            await windowModule.removeData(keyStorage);
          }, true),
        ),
      );
    } else {
      await Promise.all([
        ...Object.entries(SECURE_KEYS_STORAGE).map(
          wrapFunctionWithError(async ([keyStorage, value]) => {
            const key = keyStorage as SECURE_KEYS_STORAGE_TYPE;
            if (key === "DEVICE_ID") return;

            await SecureStore.deleteItemAsync(value);
          }, true),
        ),
        AsyncStorage.clear(),
      ]);
    }
  },
  true,
  async (_, errMsg) => {
    logError(`cleanAllStorageData() => ${errMsg}`);
  },
);

/**
 * Retrieves the user's preferred language from storage.
 *
 * This function attempts to load the language preference stored under the
 * `LANGUAGE_KEY_STORAGE` key. If a valid language is found and is included
 * in the list of supported languages, it returns the language. Otherwise,
 * it returns `null`.
 *
 * @returns {Promise<LanguagesSupported | null>} A promise that resolves to the stored language if available and supported, or `null` otherwise.
 */
export const getLanguageFromStorage =
  async (): Promise<LanguagesSupported | null> => {
    const data = await loadDataStorage("LANGUAGE");
    if (!data) return null;

    const languageAvailable = languagesSupported.includes(data);
    return languageAvailable ? data : null;
  };

/**
 * Retrieves the device's current language and saves it to storage if it is supported.
 *
 * @returns {Promise<LanguagesSupported | null>} The detected and supported language code, or "en" if detection fails.
 *
 * @remarks
 * - Uses the first locale from the device's localization settings.
 * - Checks if the detected language is among the supported languages.
 * - Saves the language to storage using a predefined key.
 * - Returns "en" as a fallback if detection or saving fails.
 *
 * @throws Will log an error if there is an issue during language detection or storage.
 */
export const getLanguageFromDevice = wrapFunctionWithError(
  async () => {
    const locales = Localization.getLocales()[0];
    const language = locales.languageCode as LanguagesSupported;
    const languageAvailable = languagesSupported.includes(language || "");
    if (language && languageAvailable) {
      saveDataStorage("LANGUAGE", language);
      return language;
    }
    return "en";
  },
  true,
  async (_, errMsg) => {
    logError(`.utils/functions/getLanguageFromDevice() => ${errMsg}`);
    return "en" as LanguagesSupported;
  },
);

/**
 * Checks the user's language preference and saves it if not already set.
 *
 * @returns The user's preferred language, or "en" if not found.
 *
 * @remarks
 * - This function uses `expo-localization` to get the device's locale.
 * - It checks if the language is supported and saves it to local storage.
 * - If no language is found, it defaults to "en".
 */
export const checkLanguage = async (): Promise<LanguagesSupported> => {
  let lang: LanguagesSupported | null = await getLanguageFromStorage();
  if (lang) return lang;

  lang = await getLanguageFromDevice();
  if (lang) return lang;

  await saveDataStorage("LANGUAGE", "en");
  return "en";
};
