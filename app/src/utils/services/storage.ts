import {
  isSecureKey,
  ALL_KEYS_STORAGE,
  SECURE_KEYS_STORAGE,
  ExpectedStorageTypes,
  wrapFunctionWithError,
  ALL_KEYS_STORAGE_TYPE,
  ALL_KEYS_STORAGE_KEYS,
  DO_NOT_DELETE_OR_SAVE,
  SECURE_KEYS_STORAGE_TYPE,
} from "@common";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { REPLACERS } from "../TOP_LEVEL";
import { windowModule } from "@modules";
import * as SecureStore from "expo-secure-store";
import { reloadAppAsync } from "expo";
import { cloneDeep } from "lodash";

type SaveDataStorage = {
  <T extends ALL_KEYS_STORAGE_TYPE>(
    key: T,
    value: ExpectedStorageTypes<"BOTH">[T],
  ): Promise<void>;

  <T extends ALL_KEYS_STORAGE_TYPE, U>(
    key: T,
    value: ExpectedStorageTypes<"BOTH">[T],
    callback: (err?: Error, errMsg?: string) => U,
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
    callback: (err?: Error, errMsg?: string) => R,
  ): Promise<R>;
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
    import("@utils").then(({ logger }) => {
      logger.error("Error stringifying data:", error, value);
    });
    return "notValid";
  }
};

const functionFallback = (functionName: string) => () =>
  import("@utils").then(({ logger }) => {
    logger.log(
      `Function created after parsed data, original function name: "${functionName}"`,
    );
  });

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

export const parseData = <T = object | null>(
  value: string | null,
): T | null => {
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

const saveDataStorage: SaveDataStorage = wrapFunctionWithError(
  async (
    keyStorage: Parameters<SaveDataStorage>[0],
    value: Parameters<SaveDataStorage>[1],
    ...args: Parameters<SaveDataStorage>[2][]
  ) => {
    const key = ALL_KEYS_STORAGE[keyStorage];

    const returnType = (err?: Error, errMsg?: string) => {
      const callback = args?.[0];

      if (typeof callback !== "function") return;

      return callback(err, errMsg) as void;
    };

    const stringifiedValue = stringifyData(value);

    if (REPLACERS.isNative) {
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
    const { DATA_PLATFORM } = await import("../cross");

    if (!DATA_PLATFORM.isElectron && !REPLACERS.isDev)
      throw new Error("Not an Electron build");
    else if (!DATA_PLATFORM.isElectron)
      localStorage.setItem(key, stringifiedValue);
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

    const callback = args?.[1]; // [value, callback]
    if (typeof callback === "function") return callback(err, errMsg);

    import("@utils").then(({ logger }) => {
      logger.error(`saveDataStorage("${keyStorage}") => ${errMsg}`);
    });
  },
);

const loadDataStorage: LoadDataStorage = wrapFunctionWithError(
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

    if (REPLACERS.isNative) {
      let value: string | null;
      if (isSecureKey(keyStorage)) value = await SecureStore.getItemAsync(key);
      else value = await AsyncStorage.getItem(key);

      const parsed = parseData(value);
      return returnValue(parsed);
    }

    const { DATA_PLATFORM } = await import("../cross");
    let value: string | null = null;

    if (!DATA_PLATFORM.isElectron && !REPLACERS.isDev)
      throw new Error("Not an Electron build");
    else if (!DATA_PLATFORM.isElectron) value = localStorage.getItem(key);
    else value = await windowModule.loadData(keyStorage);

    const parsedResponse = parseData(value);
    return returnValue(parsedResponse);
  },
  true,
  (err, errMsg, keyStorage, ...args: unknown[]) => {
    const arg = args?.[0]; // [fallbackValue | func]
    if (typeof arg === "function") return arg(null, err, errMsg);
    if (keyStorage === "DEVICE_ID" && !REPLACERS.isDev) reloadAppAsync();

    import("@utils").then(({ logger }) => {
      logger.error(`loadDataStorage("${keyStorage}") => ${errMsg}`);
    });
    if (typeof arg !== "undefined") return arg;
    return null;
  },
);

const removeDataStorage: RemoveDataStorage = wrapFunctionWithError(
  async (
    keyStorage: Parameters<RemoveDataStorage>[0],
    ...args: Parameters<RemoveDataStorage>[1][]
  ) => {
    const key = ALL_KEYS_STORAGE[keyStorage];

    const returnType = (err?: Error, errMsg?: string) => {
      const callback = args?.[0];
      if (typeof callback !== "function") return;

      return callback(err, errMsg) as void;
    };

    if (keyStorage === "DEVICE_ID") {
      const errMsg = "Cannot remove device ID from storage";
      return returnType(new Error(errMsg), errMsg);
    }
    if (REPLACERS.isWeb && key === "TERMINAL_COMMANDS") {
      const errMsg = "Cannot remove terminal commands on web";
      return returnType(new Error(errMsg), errMsg);
    }

    if (REPLACERS.isNative) {
      if (isSecureKey(keyStorage)) await SecureStore.deleteItemAsync(key);
      else await AsyncStorage.removeItem(key);

      return returnType();
    }

    const { DATA_PLATFORM } = await import("../cross");

    if (!DATA_PLATFORM.isElectron && !REPLACERS.isDev)
      throw new Error("Not an Electron build");
    else if (!DATA_PLATFORM.isElectron) localStorage.removeItem(key);
    else await windowModule.removeData(keyStorage);

    return returnType();
  },
  true,
  (err, errMsg, keyStorage, ...args: unknown[]) => {
    if (keyStorage === "DEVICE_ID") throw new Error(errMsg);

    const errCallback = args?.[0];
    if (typeof errCallback === "function") return errCallback(err, errMsg);

    import("@utils").then(({ logger }) => {
      logger.error(`removeDataStorage("${keyStorage}") => ${errMsg}`);
    });
  },
);

const cleanAllStorageData = wrapFunctionWithError(
  async () => {
    if (REPLACERS.isWeb) {
      const { DATA_PLATFORM } = await import("../cross");
      if (!DATA_PLATFORM.isElectron) return;

      localStorage.clear();
      await Promise.all(
        ALL_KEYS_STORAGE_KEYS.map(
          wrapFunctionWithError(async (keyStorage) => {
            if (DO_NOT_DELETE_OR_SAVE.includes(keyStorage)) return;

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
    import("@utils").then(({ logger }) => {
      logger.error(`cleanAllStorageData() => ${errMsg}`);
    });
  },
);

class StorageManagement {
  public static instance: StorageManagement;

  #hasUI: boolean = false;
  #promise: Promise<void> | null = null;

  private isLoaded = false;

  public get hasUI() {
    return this.#hasUI;
  }

  /**
   * Waits until the storage data is fully loaded and ready for access.
   *
   * This method returns a promise that resolves when the storage data has been loaded
   * and the `isLoaded` property is set to true. It periodically checks the loading status
   * every 50 milliseconds until the data is ready.
   *
   * @returns A promise that resolves when the storage data is loaded and ready for use.
   */
  public waitUntilLoaded = async (): Promise<void> => {
    if (this.isLoaded) return;
    if (this.#promise) return this.#promise;

    const checkLoaded = async () => {
      const { waitForTime } = await import("../functions");

      while (!this.isLoaded) {
        await waitForTime(50);
      }

      const startTime = Date.now();
      const timeout = 10 * 1000;

      while (!this.#hasUI) {
        await waitForTime(50);
        if (Date.now() - startTime > timeout) return;
      }
      await waitForTime(1000);
    };

    this.#promise = checkLoaded();

    return this.#promise;
  };

  public setHasUI = async (): Promise<void> => {
    this.#hasUI = true;
  };

  #data = {} as ExpectedStorageTypes<"BOTH">;
  #loadData = async () => {
    const { ready, getRandomUUID, logger } = await import("@utils");

    try {
      await ready();

      const data: Record<string, unknown> = {};
      const deviceId = await loadDataStorage("DEVICE_ID");
      if (!deviceId) await saveDataStorage("DEVICE_ID", getRandomUUID());

      await Promise.all(
        ALL_KEYS_STORAGE_KEYS.map(
          wrapFunctionWithError(
            async (keyStorage) => {
              const value = await loadDataStorage(keyStorage);
              if (keyStorage === "DEVICE_ID" && !value && !REPLACERS.isDev)
                reloadAppAsync("No device ID found.");

              data[keyStorage] = value;
            },
            true,
            async (_, errMsg, key) => {
              logger.error(
                "STORAGE",
                `#loadData() => loadDataStorage("${key}") => ` + errMsg,
              );
              data[key] = null;
            },
          ),
        ),
      );

      this.#data = data as ExpectedStorageTypes<"BOTH">;
      this.isLoaded = true;
    } catch (e) {
      logger.error("STORAGE", "Failed to load storage data.", e);
      if (!REPLACERS.isDev) reloadAppAsync("Failed to load storage data.");
    }
  };

  /**
   * Loads data from storage based on the platform and key type.
   *
   * @template T - The expected type of the returned data
   * @param {string} key - The storage key to retrieve data from. Can be a secure key or regular key.
   * @param {...any} args - Optional arguments:
   *   - A fallback value to return if no data is found
   *
   * @returns {Promise<T | unknown>} The parsed data from storage, the result of the callback function,
   *   the fallback value, or null if an error occurs
   *
   * @throws {Error} Throws an error if running on web platform in production mode without Electron
   */
  public get = <
    T extends ALL_KEYS_STORAGE_TYPE,
    U extends ExpectedStorageTypes<"BOTH">[T],
    R = Exclude<ExpectedStorageTypes<"BOTH">[T], null | undefined>,
  >(
    key: T,
    fallbackValue?: U,
  ): U | R => {
    if (fallbackValue === undefined) {
      const returnValue = this.#data[key] as R;
      if (typeof returnValue === "object" && returnValue !== null)
        return cloneDeep(returnValue);

      return returnValue;
    } else {
      const returnValue = (this.#data[key] || fallbackValue) as U;
      if (typeof returnValue === "object" && returnValue !== null)
        return cloneDeep(returnValue);

      return returnValue;
    }
  };

  /**
   * Saves data to storage based on the platform and key type.
   *
   * On native platforms (iOS/Android), uses SecureStore for secure keys and AsyncStorage for regular keys.
   * On web platforms, uses localStorage for development or Electron's storage API for production builds.
   *
   * @param key - The storage key under which to save the data
   * @param value - The value to be stored (will be stringified automatically)
   * @param args - Optional error callback function that receives (value: ExpectedStorageTypes<"BOTH">[T], error: Error, errorMessage: string)
   *
   * @remarks
   * - Secure keys are automatically detected using `isSecureKey()`
   * - In non-Electron web builds (development mode), falls back to localStorage
   * - Data is automatically stringified before storage using `stringifyData()`
   * - All errors are wrapped and handled by `wrapFunctionWithError()`
   *
   * @throws {Error} When attempting to save any protected key
   * @throws {Error} When not running in an Electron build and not in development mode
   * @throws {Error} When Electron storage operation fails
   */
  public save = <T extends ALL_KEYS_STORAGE_TYPE>(
    key: T,
    value: ExpectedStorageTypes<"BOTH">[T],
    callback?: (
      value: ExpectedStorageTypes<"BOTH">[T],
      err?: Error,
      errMsg?: string,
    ) => void,
  ): void => {
    saveDataStorage(key, value, (err, errMsg) => {
      callback?.(value, err, errMsg);

      if (!errMsg || !err) {
        this.#data[key] = value;
        return;
      }

      import("@utils").then(({ logger }) => {
        logger.error(`STORAGE`, `saveDataStorage("${key}") => ` + errMsg);
      });
    });
  };

  /**
   * Removes data from storage based on the platform and storage type.
   *
   * This function handles data removal across different platforms (native/web) and storage mechanisms
   * (SecureStore, AsyncStorage, localStorage, Electron storage). It includes validation to prevent
   * removal of protected keys and provides error handling through callbacks.
   *
   * @param key - The storage key to remove. Cannot be any protected key.
   * @param args - Optional error callback function that receives (error: Error) parameters.
   *
   * @remarks
   * - On native platforms, uses SecureStore for secure keys or AsyncStorage for regular keys
   * - On web platforms, uses localStorage (dev mode) or Electron's storage mechanism (production)
   * - Wrapped with error handling that logs errors or calls the provided error callback
   *
   * @throws {Error} When attempting to remove any protected key
   * @throws {Error} When running on web in production mode without Electron build
   */
  public remove = <T extends ALL_KEYS_STORAGE_TYPE>(
    key: T,
    callback?: (err: Error | null) => void,
  ): void => {
    if (DO_NOT_DELETE_OR_SAVE.includes(key))
      throw new Error(`Cannot remove protected key: "${key}"`);

    removeDataStorage(key, (err, errMsg) => {
      callback?.(err ?? null);

      if (!errMsg || !err) {
        this.#data[key as "USER_DATA"] = null;
        return;
      }
      import("@utils").then(({ logger }) => {
        logger.error(`STORAGE`, `removeDataStorage("${key}") => ` + errMsg);
      });
    });
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
   * - Some protected keys are explicitly preserved across all platforms
   * - Individual key deletion errors are silently ignored to ensure the cleanup process continues
   * - Any top-level errors are logged via `logError`
   *
   * @returns A promise that resolves when all storage cleanup operations are complete
   */
  public cleanAll = () => {
    cleanAllStorageData();
  };

  /**
   * Reloads all data from storage into the internal state.
   *
   * This method re-fetches all stored data and updates the internal `#data` property
   * to reflect the current state of the storage. It is useful for synchronizing
   * the in-memory representation with the persistent storage.
   *
   * @returns A promise that resolves when the data has been reloaded.
   */
  public reloadData = async (): Promise<void> => {
    this.isLoaded = false;
    await this.#loadData();
  };

  constructor() {
    this.#loadData();
  }
}

export const storageManagement = new StorageManagement();
