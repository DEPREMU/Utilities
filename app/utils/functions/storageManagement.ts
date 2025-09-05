import {
  RequestDecrypt,
  RequestEncrypt,
  ResponseDecrypt,
  ResponseEncrypt,
  LanguagesSupported,
} from "@types";
import { logError } from "./debug";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Localization from "expo-localization";
import { KeyStorageValues } from "../constants/keysStorage";
import { languagesSupported } from "../translates";
import { parseData, stringifyData } from "./appManagement";
import { fetchOptions, getRouteAPI } from "./APIManagement";

/**
 * Securely stores a value under a specified key.
 *
 * - On **native platforms**, it uses `SecureStore`.
 * - On **web**, it encrypts the data using an API and stores it in `localStorage`.
 *
 * @param key - The storage key. Must be a valid `KeyStorageValues`.
 * @param value - The value to store. Will be stringified if not a string.
 * @param callback - Optional callback executed after the operation, receives an error if failed.
 */
export const saveDataSecure = async <T = undefined>(
  key: KeyStorageValues,
  value: unknown,
  callback: (err?: Error) => T = () => undefined as T,
): Promise<T> => {
  try {
    const stringifiedValue = stringifyData(value);

    if (Platform.OS !== "web") {
      await SecureStore.setItemAsync(key, stringifiedValue);
      return callback?.();
    }

    const response = await fetch(
      await getRouteAPI("/encrypt"),
      fetchOptions<RequestEncrypt>("POST", {
        dataToEncrypt: stringifiedValue,
      }),
    );
    const result = (await response.json()) as ResponseEncrypt;

    if (result.error || !result.dataEncrypted) {
      const message = result?.error || "No encrypted data returned from API";
      logError(`saveDataSecure() => ${message} - ${result?.timestamp || ""}`);
      return callback?.(new Error(message));
    }

    localStorage.setItem(key, result.dataEncrypted);
    return callback?.();
  } catch (error) {
    logError(`saveDataSecure() => ${error}`);
    return callback?.(
      new Error(error instanceof Error ? error.message : String(error)),
    );
  }
};

/**
 * Loads secure data stored under a given key.
 *
 * - On **native platforms**, it retrieves the value via `SecureStore`.
 * - On **web**, it decrypts the value stored in `localStorage` using an API.
 *
 * @param key - The key to retrieve. Must be a valid `KeyStorageValues`.
 * @returns The decrypted string or `null` if not found or decryption fails.
 */
export const loadDataSecure = async <T = string | object | null>(
  key: KeyStorageValues,
  callback?: (value: T | null, err?: Error) => T,
): Promise<T | undefined> => {
  if (Platform.OS !== "web") {
    const value = await SecureStore.getItemAsync(key);
    const parsed = parseData<T>(value);
    if (callback) return callback?.(parsed);
    return parsed;
  }

  const storedValue = localStorage.getItem(key);
  if (!storedValue) return callback?.(null, new Error("No value found")) as T;

  try {
    const result = await fetch(
      await getRouteAPI("/decrypt"),
      fetchOptions<RequestDecrypt>("POST", {
        dataToDecrypt: storedValue,
      }),
    ).then(async (res) => (await res.json()) as ResponseDecrypt);

    if (result?.error || !result?.decryptedValue) {
      logError(`loadDataSecure() => ${result?.error} - ${result?.timestamp}`);
      return callback?.(null, new Error(result?.error || "Decryption failed"));
    }

    const parsed = parseData<T>(result.decryptedValue);

    if (callback) return callback(parsed);
    return parsed;
  } catch (error) {
    logError(`loadDataSecure() => ${error}`);
    return callback?.(
      null,
      new Error(error instanceof Error ? error.message : String(error)),
    );
  }
};

/**
 * Removes securely stored data under the given key.
 *
 * - On **native platforms**, uses `SecureStore.deleteItemAsync`.
 * - On **web**, removes from `localStorage`.
 *
 * @param key - The key of the data to remove.
 * @param callback - Optional callback executed after the operation, receives an error if failed.
 */
export const removeDataSecure = async <T = undefined>(
  key: KeyStorageValues,
  callback: (err?: Error) => T = () => undefined as T,
): Promise<T> => {
  try {
    if (Platform.OS === "web") localStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch (error) {
    logError(`removeDataSecure() => ${error}`);
    return callback?.(
      new Error(error instanceof Error ? error.message : String(error)),
    );
  }

  return callback?.();
};

/**
 * Stores data under a specified key.
 *
 * - On **web**, uses `localStorage`.
 * - On **native**, uses `AsyncStorage`.
 *
 * @param key - The key to store the value under.
 * @param value - The value to store. Non-string values will be stringified.
 */
export const saveData = async <T = undefined, K = unknown>(
  key: KeyStorageValues,
  value: K,
  callback: () => T = () => undefined as T,
): Promise<T> => {
  const stringValue = stringifyData(value);

  if (Platform.OS === "web") localStorage.setItem(key, stringValue);
  else await AsyncStorage.setItem(key, stringValue);
  return callback?.();
};

/**
 * Loads data associated with a given key.
 *
 * - On **web**, reads from `localStorage`.
 * - On **native**, uses `AsyncStorage`.
 *
 * @param key - The key to retrieve the value from.
 * @returns The stored value as a string, or `null` if not found.
 */
export const loadData = async <T = string | null>(
  key: KeyStorageValues,
  callback?: (value: T) => T,
): Promise<T> => {
  let value: string | null;

  if (Platform.OS === "web") value = localStorage.getItem(key);
  else value = await AsyncStorage.getItem(key);

  const parsed = parseData<T>(value);
  if (callback) return callback(parsed);
  return parsed;
};

/**
 * Removes data associated with a specified key.
 *
 * - On **web**, removes from `localStorage`.
 * - On **native**, removes from `AsyncStorage`.
 *
 * @param key - The key of the value to remove.
 * @param callback - Optional callback executed after deletion.
 */
export const removeData = async <T = undefined>(
  key: KeyStorageValues,
  callback: (err?: Error) => T = () => undefined as T,
): Promise<T> => {
  try {
    if (Platform.OS === "web") localStorage.removeItem(key);
    else await AsyncStorage.removeItem(key);
  } catch (error) {
    logError(`removeData() => ${error}`);
    return callback(
      new Error(error instanceof Error ? error.message : String(error)),
    );
  }
  return callback();
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
    const data = await loadData<LanguagesSupported | null>(
      "@languageKeyStorage",
    );
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
