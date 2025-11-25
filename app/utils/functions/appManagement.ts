import {
  Notifications,
  LanguagesSupported,
  RequestDatabaseFetch,
  ResponseDatabaseFetch,
} from "@types";
import axios from "axios";
import * as Updates from "expo-updates";
import _BackgroundTimer from "react-native-background-timer";
import { log, logError } from "./debug";
import * as Localization from "expo-localization";
import { loadDataSecure } from "./storageManagement";
import { Falsy, Platform } from "react-native";
import { ExpectedStorageTypes } from "@types";
import { fetchOptions, getRouteAPI } from "./APIManagement";
import { initializeNotificationsStorage } from "./notifications";

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
      timeZone: "America/Mexico_City",
    };

  return new Intl.DateTimeFormat(locale, options).format(date);
};

const functionFallback = (functionName: string) => () =>
  log(
    `Function created after parsed data, original function name: "${functionName}"`,
  );
const symbolFallback = (symbolName: string) =>
  Symbol(
    `Symbol created after parsed data, original symbol name: "${symbolName}"`,
  );

const getCorrectParsed = <T = object | null>(obj: object | null): T => {
  if (!obj) return null as T;
  if (Array.isArray(obj))
    return obj.map((value) => {
      if (value === "<<Function>>") return functionFallback(value);
      if (value === "<<Symbol>>") return symbolFallback(value);
      if (typeof value === "object") return getCorrectParsed<T>(value);
      return value;
    }) as T;
  else
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        if (value === "<<Function>>") return [key, functionFallback(key)];
        if (value === "<<Symbol>>") return [key, symbolFallback(key)];
        if (typeof value === "object") return [key, getCorrectParsed(value)];
        return [key, value];
      }),
    ) as T;
};

export const parseData = <T = object | null>(value: string | null): T => {
  let parsed: T;
  try {
    if (!value) return value as T;
    if (value.includes("<<Symbol>>") || value.includes("<<Function>>")) {
      const parsedValue = JSON.parse(value);
      return getCorrectParsed<T>(parsedValue);
    } else parsed = JSON.parse(value || "null") as T;
  } catch {
    parsed = value as T;
  }
  return parsed;
};

/**
 * Gets a valid representation of a value for logging or debugging purposes.
 *
 * @param value - The value to process.
 * @returns A valid representation of the value.
 */
const getValidValue = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "symbol") return "<<Symbol>>";
  if (typeof value === "function") return "<<Function>>";
  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) return sortArray(value);
    return sortObject(value);
  }

  return value;
};

/**
 * Sorts an array by getting valid representations of its elements.
 *
 * @param arr - The array to sort.
 * @returns The sorted array.
 */
export const sortArray = (arr: unknown[]): unknown[] => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(getValidValue).sort();
};

/**
 * Sorts an object by getting valid representations of its values.
 *
 * @param obj - The object to sort.
 * @returns The sorted object.
 */
export const sortObject = (obj: object): { [key: string]: unknown } => {
  if (typeof obj !== "object" || obj === null) return obj;
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));

  const sortedEntries = Object.fromEntries(
    keys.map((key) => {
      const valueKey = getValidValue(obj[key as keyof typeof obj]);

      return [key, valueKey];
    }),
  );
  return sortedEntries;
};

/**
 * Stringifies a value.
 *
 * @param value - The value to stringify.
 * @returns The stringified representation of the value.
 */
export const stringifyData = (value: unknown): string => {
  if (typeof value === "string") return value;
  try {
    if (value instanceof Date) return getValidValue(value) as string;
    if (value && typeof value === "object") {
      if (Array.isArray(value)) return JSON.stringify(sortArray(value));

      return JSON.stringify(sortObject(value));
    }
    if (!value) return String(value);

    return JSON.stringify(value);
  } catch (error) {
    logError("Error stringifying data:", error, value);
    return "notValid";
  }
};

/**
 * Creates a debounced version of the provided function that delays its execution until after
 * a specified delay has elapsed since the last time it was invoked.
 *
 * @typeParam T - The type of the function to debounce.
 * @param func - The function to debounce.
 * @param delay - The number of milliseconds to delay.
 * @returns A debounced version of the input function.
 */
export const debounce = <T extends (...args: unknown[]) => unknown, K = void>(
  func: T,
  delay: number,
): (() => K) => {
  let timeoutId: NodeJS.Timeout | number;
  const debouncedFunc = (...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };

  return debouncedFunc as unknown as () => K;
};

/**
 * Replaces placeholders in a message string with corresponding values from an array.
 *
 * Placeholders in the message should be in the format `{0}`, `{1}`, etc.
 * Each placeholder will be replaced by the value at the corresponding index in the `values` array.
 * If a placeholder index does not exist in the array, the placeholder is left unchanged.
 *
 * @param message - The message string containing placeholders.
 * @param values - An array of strings to replace the placeholders.
 * @returns The interpolated message with placeholders replaced by corresponding values.
 *
 * @example
 * ```typescript
 * const msg = "Hello, {0}! You have {1} new messages.";
 * const result = interpolateMessage(msg, ["Alice", "5"]);
 * // result: "Hello, Alice! You have 5 new messages."
 * ```
 */
export const interpolateMessage = (message: string, values: string[]) => {
  if (!message || !values || values.length === 0) return message;
  return message.replace(/\{(\d+)\}/g, (match, index) => {
    const value = values[parseInt(index, 10)];
    return value !== undefined ? value : match;
  });
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

/**
 * Checks if a value is falsy.
 *
 * A value is considered falsy if it is:
 * - `null`
 * - `undefined`
 * - `false`
 * - an empty string (`""`)
 * Falsy values do not include `0`, `NaN`, or empty arrays/objects.
 *
 * @param value - The value to check.
 * @returns `true` if the value is falsy, otherwise `false`.
 */
export const isFalsy = (value: unknown): value is Falsy => {
  return (
    value === null || value === undefined || value === false || value === ""
  );
};

/**
 * Gets the date that is a specified number of days in the future.
 *
 * @param days - The number of days to add to the current date.
 * @returns A Date object representing the future date.
 */
export const getDateWithDaysAhead = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Retrieves the notifications data from storage.
 *
 * This function initializes the notifications storage if it hasn't been set up yet.
 * It returns the current notifications data or null if not found.
 *
 * @returns A promise that resolves to the notifications data or null.
 */
export const getNotifications = async (): Promise<Notifications> => {
  return await initializeNotificationsStorage();
};

export const getCryptosFromDatabase = async (
  lang: LanguagesSupported,
  token: string,
): Promise<ExpectedStorageTypes["_selectedCryptos"]> => {
  const [url, deviceId] = await Promise.all([
    getRouteAPI("/database/fetch"),
    loadDataSecure("_deviceId"),
  ]);
  const response = await fetch(
    url,
    fetchOptions<RequestDatabaseFetch>(
      "POST",
      {
        lang,
        deviceId: deviceId || "local-device",
        table: "Cryptos",
        match: null,
      },
      token,
    ),
  );

  if (!response.ok) {
    logError("Error fetching cryptos from Database:", response.statusText);
    return null;
  }

  const data = (await response.json()) as ResponseDatabaseFetch<"Cryptos">;

  let cryptos = data.data;
  if (!cryptos) return null;
  if (!Array.isArray(cryptos)) cryptos = [cryptos];

  return cryptos.reduce(
    (acc, crypto) => {
      if (!acc) return acc;

      if (crypto.id && crypto.currency)
        acc[crypto.id + crypto.currency] = crypto;
      return acc;
    },
    {} as ExpectedStorageTypes["_selectedCryptos"],
  );
};

export const isNewUpdateAvailable = async (): Promise<boolean> => {
  return (await Updates.checkForUpdateAsync()).isAvailable;
};

export const fetchAndApplyUpdate = async (): Promise<void> => {
  try {
    const update = await Updates.fetchUpdateAsync();

    if (update.isNew) {
      log("New update downloaded, applying update...");
      await Updates.reloadAsync();
    } else {
      log("No new update available to fetch.");
    }
  } catch (error) {
    logError("Error fetching or applying update:", error);
  }
};

export const setTimeoutPolyfill = (
  fn: (...args: unknown[]) => void,
  timeout: number,
): NodeJS.Timeout | number => {
  if (Platform.OS === "android")
    return _BackgroundTimer.setTimeout(fn, timeout);
  else return setTimeout(fn, timeout);
};

export const clearTimeoutPolyfill = (id: NodeJS.Timeout | number): void => {
  if (Platform.OS === "android") _BackgroundTimer.clearTimeout(id as number);
  else clearTimeout(id as NodeJS.Timeout);
};

export const setIntervalPolyfill = (
  fn: (...args: unknown[]) => void,
  interval: number,
): NodeJS.Timeout | number => {
  if (Platform.OS === "android")
    return _BackgroundTimer.setInterval(fn, interval);
  else return setInterval(fn, interval);
};

export const clearIntervalPolyfill = (id: NodeJS.Timeout | number): void => {
  if (Platform.OS === "android") _BackgroundTimer.clearInterval(id as number);
  else clearInterval(id as NodeJS.Timeout);
};

export const checkUrlStatus = async (
  url: string,
  method: "get" | "post" = "get",
  timeout: number = 3000,
): Promise<boolean> => {
  try {
    const res = await axios.request({
      url,
      method,
      timeout,
      data: method === "post" ? {} : undefined,
      responseType: "stream",
      validateStatus: () => true,
    });
    res?.data?.destroy?.();
    return res.status >= 200 && res.status < 400;
  } catch (error) {
    logError(`Error checking URL status for ${url}:`, error);
    return false;
  }
};
