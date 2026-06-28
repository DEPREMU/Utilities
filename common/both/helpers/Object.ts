import { cloneDeep } from "lodash";

type FromEntries<T extends ReadonlyArray<readonly [PropertyKey, unknown]>> = {
  [E in T[number] as E[0]]: E[1];
};

type StrictEntries<T> = Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>;
type StrictKeys<T> = Array<keyof T>;
type StrictValues<T> = Array<T[keyof T]>;

export const Object = {
  removeProperties: <T extends Record<string, unknown>, K extends keyof T>(
    obj: T,
    ...keys: K[]
  ): Omit<T, K> => {
    const result = cloneDeep(obj);
    keys.forEach((key) => {
      delete result[key];
    });
    return result;
  },

  fromEntries: global.Object.fromEntries as <
    const T extends ReadonlyArray<readonly [PropertyKey, unknown]>,
  >(
    entries: T,
  ) => FromEntries<T>,

  entries: globalThis.Object.entries as <T extends object>(
    obj: T,
  ) => StrictEntries<T>,

  values: globalThis.Object.values as <T extends object>(
    obj: T,
  ) => StrictValues<T>,

  keys: globalThis.Object.keys as <T extends object>(obj: T) => StrictKeys<T>,
} as const;
