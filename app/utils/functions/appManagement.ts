import * as Network from "expo-network";
import { saveData } from "./storageManagement";
import * as Localization from "expo-localization";
import { initializeNotificationsStorage } from "./notifications";
import { Notifications, ReasonNotification } from "@types";

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

/**
 * Parses a JSON string into an object of type `T`.
 *
 * @template T - The expected return type, defaults to `object | null`.
 * @param value - The JSON string to parse. If `null`, it will be treated as `"null"`.
 * @returns The parsed object of type `T`. If parsing fails, returns the original value cast to type `T`.
 */
export const parseData = <T = object | null>(value: string | null): T => {
  let parsed: T;
  try {
    parsed = JSON.parse(value || "null") as T;
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
const sortArray = (arr: unknown[]): unknown[] => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(getValidValue).sort();
};

/**
 * Sorts an object by getting valid representations of its values.
 *
 * @param obj - The object to sort.
 * @returns The sorted object.
 */
const sortObject = (obj: object): { [key: string]: unknown } => {
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
    console.error(`Error stringifying data: ${error}`, value);
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
  let timeoutId: NodeJS.Timeout;
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
 *
 * @example
 * ```typescript
 * const result = capitalize("hello");
 * console.log(result); // Output: "Hello"
 * ```
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
 *
 * @param value - The value to check.
 * @returns `true` if the value is falsy, otherwise `false`.
 */
export const isFalsy = (value: unknown): boolean => {
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
 * Checks if the device has an active internet connection.
 *
 * This function uses the `expo-network` library to determine the network state
 * and checks if the device is connected to the internet.
 *
 * @returns {Promise<boolean>} A promise that resolves to `true` if the device is connected to the internet, otherwise `false`.
 */
export const hasInternetConnection = async (): Promise<boolean> => {
  const { isConnected, isInternetReachable } =
    await Network.getNetworkStateAsync();

  return !!isConnected && !!isInternetReachable;
};

/**
 * Retrieves the notifications data from storage.
 *
 * This function initializes the notifications storage if it hasn't been set up yet.
 * It returns the current notifications data or null if not found.
 *
 * @returns A promise that resolves to the notifications data or null.
 */
export const getNotifications = async (): Promise<Notifications | null> => {
  const data = await initializeNotificationsStorage();

  const keysData = Object.keys(data.data);
  keysData.forEach((key) => {
    data.data[key as ReasonNotification] = null;
  });

  saveData("@notifications", stringifyData(data));
  return data;
};
