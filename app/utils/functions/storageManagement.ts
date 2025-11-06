import {
  ALL_KEYS_STORAGE,
  SECURE_KEYS_STORAGE,
  ALL_KEYS_STORAGE_TYPE,
  SECURE_KEYS_STORAGE_TYPE,
  UNSECURE_KEYS_STORAGE_TYPE,
} from "../constants/keysStorage";
import { logError } from "./debug";
import { Platform } from "react-native";
import windowModule from "../modules/WindowModule";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Localization from "expo-localization";
import { languagesSupported } from "../translates";
import { parseData, stringifyData } from "./appManagement";
import { LanguagesSupported, ExpectedStorageTypes } from "@types";

/**
 * Securely saves data to storage based on the platform.
 *
 * On native platforms (iOS/Android), uses SecureStore to save the data.
 * On web platforms, attempts to save data using Electron's secure storage if available.
 *
 * @template T - The key type that extends SECURE_KEYS_STORAGE_TYPE
 * @template U - The return type of the callback function, defaults to undefined
 *
 * @param {T} key - The storage key from the secure keys type
 * @param {ExpectedStorageTypes[T]} value - The value to store, must match the expected type for the given key
 * @param {(err?: Error) => U} [callback] - Optional callback function called after save operation completes.
 *                                          Receives an Error parameter if the operation failed.
 *                                          Defaults to a function returning undefined.
 *
 * @returns {Promise<U>} A promise that resolves with the callback's return value
 *
 * @throws {Error} Logs error if storage operation fails, error is passed to callback
 */
export const saveDataSecure = async <
  T extends SECURE_KEYS_STORAGE_TYPE,
  U = undefined,
>(
  key: T,
  value: ExpectedStorageTypes[T],
  callback: (err?: Error) => U = () => undefined as U,
): Promise<U> => {
  try {
    const stringifiedValue = stringifyData(value);
    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(key, stringifiedValue);
      return callback?.();
    }
    try {
      const isElectron = await windowModule.isElectronBuild();
      if (!isElectron) return callback?.(new Error("Not an Electron build"));

      const { success } = (await windowModule.saveData(
        key,
        stringifiedValue,
      )) || { success: false };

      if (success) return callback?.();
      return callback?.(new Error("Failed to save data in Electron build"));
    } catch (error) {
      return callback?.(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  } catch (error) {
    logError(`saveDataSecure() => ${error}`);
    return callback?.(
      new Error(error instanceof Error ? error.message : String(error)),
    );
  }
};

/**
 * Loads data securely from either React Native's SecureStore or Electron's secure storage.
 *
 * @template T - A key type that extends SECURE_KEYS_STORAGE_TYPE
 * @template U - The expected return type, defaults to ExpectedStorageTypes[T] | null
 *
 * @param {T} key - The storage key to retrieve data from
 * @param {(value: U, err?: Error) => U} [callback] - Optional callback function to process the retrieved value or handle errors
 *
 * @returns {Promise<U | undefined>} A promise that resolves to the parsed data, the callback result, or undefined
 *
 * @remarks
 * - On non-web platforms: Uses React Native's SecureStore
 * - On web platforms: Checks if running in Electron and uses windowModule for secure storage
 * - Returns the callback result if provided, otherwise returns the parsed data
 * - On error, invokes callback with null value and error, or returns undefined if no callback
 */
export const loadDataSecure = async <
  T extends SECURE_KEYS_STORAGE_TYPE,
  U = ExpectedStorageTypes[T] | null,
>(
  key: T,
  callback?: (value: U, err?: Error) => U,
): Promise<U | undefined> => {
  if (Platform.OS !== "web") {
    const value = await SecureStore.getItemAsync(key);
    const parsed = parseData<U>(value);
    if (callback) return callback?.(parsed);
    return parsed;
  }

  try {
    const isElectron = await windowModule.isElectronBuild();
    if (!isElectron)
      return callback?.(null as U, new Error("Not an Electron build")) as U;

    const response = await windowModule.loadData(key);
    const parsedResponse = parseData<U>(response);
    if (callback) return callback?.(parsedResponse);
    return parsedResponse;
  } catch (error) {
    logError(`loadDataSecure() => ${error}`);
    return callback?.(
      null as U,
      error instanceof Error ? error : new Error(String(error)),
    ) as U;
  }
};

/**
 * Removes securely stored data associated with the specified key.
 *
 * On non-web platforms, uses SecureStore to delete the item.
 * On web platforms (Electron), uses the window module to remove the data.
 *
 * @template T - The return type of the callback function
 * @param key - The secure storage key to remove
 * @param callback - Optional callback function invoked after removal, receives an error if the operation fails
 * @returns A promise that resolves to the callback's return value
 */
export const removeDataSecure = async <T = undefined>(
  key: SECURE_KEYS_STORAGE_TYPE,
  callback: (err?: Error) => T = () => undefined as T,
): Promise<T> => {
  try {
    if (Platform.OS !== "web") {
      await SecureStore.deleteItemAsync(key);
      return callback?.();
    }
    const isElectron = await windowModule.isElectronBuild();
    if (!isElectron) {
      return callback?.(new Error("Not an Electron build"));
    }

    await windowModule.removeData(key);
    return callback?.();
  } catch (error) {
    logError(`removeDataSecure() => ${error}`);
    return callback?.(
      new Error(error instanceof Error ? error.message : String(error)),
    );
  }
};

/**
 * Saves data to the appropriate storage mechanism based on the platform.
 *
 * This function handles storage for non-web platforms using AsyncStorage,
 * and for web platforms it uses Electron's storage API when available.
 * The data is automatically stringified before storage.
 *
 * @template T - A key type that extends UNSECURE_KEYS_STORAGE_TYPE
 * @template U - The value type, defaults to the expected storage type for the given key or undefined
 *
 * @param {T} key - The storage key identifying where to save the data
 * @param {U} value - The value to be saved, will be stringified automatically
 *
 * @returns {Promise<void>} A promise that resolves when the data is successfully saved
 *
 * @throws Logs errors via logError if storage operation fails, but does not throw
 */
export const saveData = async <
  T extends UNSECURE_KEYS_STORAGE_TYPE,
  U = ExpectedStorageTypes<"UNSECURE">[T] | undefined,
>(
  key: T,
  value: U,
): Promise<void> => {
  try {
    const stringValue = stringifyData(value);

    if (Platform.OS !== "web") {
      await AsyncStorage.setItem(key, stringValue);
      return;
    }
    const isElectron = await windowModule.isElectronBuild();
    if (isElectron) {
      await windowModule.saveData(key, stringValue);
      return;
    }
  } catch (error) {
    logError(`saveData() => ${error}`);
  }
};

/**
 * Loads data from storage based on the platform (mobile, web, or Electron).
 *
 * @template T - The storage key type, extending UNSECURE_KEYS_STORAGE_TYPE
 * @template U - The expected return type, defaults to the storage type for the key or null
 *
 * @param {T} key - The storage key to retrieve data from
 * @param {(value: U) => U} [callback] - Optional callback function to transform the retrieved value
 *
 * @returns {Promise<U | undefined>} A promise that resolves to the retrieved and optionally transformed data,
 *                                   or undefined if an error occurs
 *
 * @remarks
 * - On native platforms (iOS/Android), uses AsyncStorage
 * - On web platforms, checks if running in Electron and uses the appropriate storage method
 * - Automatically parses the stored string data into the expected type
 * - If an error occurs, logs it and returns the result of calling the callback with null (if provided)
 */
export const loadData = async <
  T extends UNSECURE_KEYS_STORAGE_TYPE,
  U = ExpectedStorageTypes<"UNSECURE">[T] | null,
>(
  key: T,
  callback?: (value: U) => U,
): Promise<U | undefined> => {
  try {
    let value: string | null;

    if (Platform.OS !== "web") value = await AsyncStorage.getItem(key);
    else {
      const isElectron = await windowModule.isElectronBuild();
      if (isElectron) value = await windowModule.loadData(key);
      else value = null;
    }

    const parsed = parseData<U>(value);
    if (callback) return callback(parsed);
    return parsed;
  } catch (error) {
    logError(`loadData() => ${error}`);
    return callback?.(null as U);
  }
};

/**
 * Removes data from storage based on the platform.
 *
 * On non-web platforms, removes the item from AsyncStorage.
 * On web platforms, removes the data using the window module if running in Electron.
 *
 * @template T - The return type of the callback function, defaults to undefined
 * @param key - The storage key to remove, must be of type UNSECURE_KEYS_STORAGE_TYPE
 * @param callback - Optional callback function invoked after removal or on error.
 *                   Receives an Error object if the operation fails.
 *                   Defaults to a function returning undefined.
 * @returns A promise that resolves to the return value of the callback function
 *
 * @throws Logs errors via logError if the removal operation fails
 */
export const removeData = async <T = undefined>(
  key: UNSECURE_KEYS_STORAGE_TYPE,
  callback: (err?: Error) => T = () => undefined as T,
): Promise<T> => {
  try {
    if (Platform.OS !== "web") {
      await AsyncStorage.removeItem(key);
      return callback();
    }
    const isElectron = await windowModule.isElectronBuild();
    if (!isElectron) {
      return callback(new Error("Not an Electron build"));
    }

    await windowModule.removeData(key);
  } catch (error) {
    logError(`removeData() => ${error}`);
    return callback(
      new Error(error instanceof Error ? error.message : String(error)),
    );
  }
  return callback();
};

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
export const cleanAllStorageData = async (): Promise<void> => {
  try {
    if (Platform.OS === "web") {
      const isElectron = await windowModule.isElectronBuild();
      if (!isElectron) return;

      localStorage.clear();
      await Promise.all(
        ALL_KEYS_STORAGE.map(async (key) => {
          if (key === "_deviceId") return;
          try {
            await windowModule.removeData(key);
          } catch {
            // Ignore errors for individual keys
          }
        }),
      );
    } else {
      const allKeys = SECURE_KEYS_STORAGE.filter((key) => key !== "_deviceId");
      await Promise.all(
        allKeys.map((key) => {
          try {
            SecureStore.deleteItemAsync(key);
          } catch {
            // Ignore errors for individual keys
          }
        }),
      );
      await AsyncStorage.clear();
    }
  } catch (error) {
    logError(`cleanAllStorageData() => ${error}`);
  }
};

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
    const data = await loadData("@languageKeyStorage");
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
export const getLanguageFromDevice =
  async (): Promise<LanguagesSupported | null> => {
    try {
      const locales = Localization.getLocales()[0];
      const language = locales.languageCode as LanguagesSupported;
      const languageAvailable = languagesSupported.includes(language || "");
      if (language && languageAvailable) {
        saveData("@languageKeyStorage", language);
        return language;
      }
    } catch (error) {
      logError(".utils/functions/checkLanguage() =>", error);
    }
    return "en";
  };

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
  let lang: LanguagesSupported | null = null;

  lang = await getLanguageFromStorage();
  if (lang) return lang;

  lang = await getLanguageFromDevice();
  if (lang) return lang;

  return "en";
};

/**
 * Checks if a given storage key is a secure key that requires encrypted storage.
 *
 * @param key - The storage key to check against secure keys list
 * @returns A type predicate indicating whether the key is a secure storage key
 */
export const isSecureKey = (
  key: ALL_KEYS_STORAGE_TYPE,
): key is SECURE_KEYS_STORAGE_TYPE => {
  return SECURE_KEYS_STORAGE.includes(key as SECURE_KEYS_STORAGE_TYPE);
};
