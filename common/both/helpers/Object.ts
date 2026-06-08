import { cloneDeep } from "lodash";

type FromEntries<T extends ReadonlyArray<readonly [PropertyKey, unknown]>> = {
  [E in T[number] as E[0]]: E[1];
};

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

  entries: global.Object.entries as <T extends Record<string, unknown>>(
    obj: T,
  ) => Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>,

  values: global.Object.values,

  keys: global.Object.keys as <T extends Record<string, unknown>>(
    obj: T,
  ) => Array<keyof T>,
} as const;
