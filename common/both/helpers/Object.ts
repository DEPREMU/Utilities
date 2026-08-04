import cloneDeep from "lodash/cloneDeep";
import { Arrays } from "./Array";
import type { TypeOfJS } from "@types";

type FromEntries<T extends ReadonlyArray<readonly [PropertyKey, unknown]>> = {
  [E in T[number] as E[0]]: E[1];
};

type StrictEntries<T> = Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>;
type StrictKeys<T> = Array<keyof T>;
type StrictValues<T> = Array<T[keyof T]>;

type Types = keyof Omit<TypeOfJS, "function" | "symbol" | "bigint">;

type ConvertOne<T, K extends keyof TypeOfJS> = K extends "string"
  ? T extends string
    ? T
    : string
  : K extends "number"
    ? T extends number
      ? T
      : number
    : K extends "boolean"
      ? T extends boolean
        ? T
        : boolean
      : K extends "object"
        ? [Extract<T, object>] extends [never]
          ? object
          : Extract<T, object>
        : TypeOfJS[K];

type MergeField<T, U> = U extends readonly (infer K extends keyof TypeOfJS)[]
  ? ConvertOne<T, K>
  : U extends keyof TypeOfJS
    ? ConvertOne<T, U>
    : T;

type Converted<
  T extends Record<string, unknown>,
  M extends Partial<Record<keyof T, Types | readonly Types[]>>,
> = {
  [
    K in keyof T as K extends keyof M
      ? M[K] extends "undefined"
        ? never
        : K
      : K
  ]: K extends keyof M ? MergeField<T[K], M[K]> : T[K];
};

type ChangeType = <
  T extends Record<string, unknown>,
  M extends Partial<Record<keyof T, Types | Types[]>>,
>(
  obj: T,
  map: M,
) => Converted<T, M>;

const changeType: ChangeType = (obj, newType) => {
  const copy = cloneDeep(obj) as Record<string, unknown>;

  Object.keys(newType).forEach((key) => {
    if (!(key in copy)) return;

    const set = new Set<Types>(Arrays.convertToArray(newType[key]) as Types[]);

    for (const type of set) {
      if (set.has(typeof copy[key] as Types)) return;

      switch (type) {
        case "boolean":
          if (obj[key] instanceof Date) {
            const time = obj[key].getTime();
            copy[key] = !isNaN(time) && time !== 0;
            break;
          }

          switch (typeof obj[key]) {
            case "string":
              copy[key] = obj[key] === "true" || obj[key] === "1";
              break;
            case "number":
              copy[key] = obj[key] === 1;
              break;
            case "boolean":
              copy[key] = obj[key];
              break;
            default:
              copy[key] = !!obj[key];
              break;
          }
          break;
        case "number":
          if (obj[key] instanceof Date) {
            copy[key] = obj[key].getTime();
            break;
          }
          if (
            typeof (obj[key] as { toNumber?: () => number })?.toNumber ===
            "function"
          ) {
            const num = (obj[key] as { toNumber: () => number }).toNumber();
            if (!isNaN(num)) copy[key] = num;

            break;
          }

          switch (typeof obj[key]) {
            case "string":
              {
                const num = parseFloat(obj[key]);
                if (!isNaN(num)) {
                  copy[key] = num;
                }
              }
              break;
            case "boolean":
              copy[key] = obj[key] ? 1 : 0;
              break;
            case "number":
              copy[key] = obj[key];
              break;
            default:
              copy[key] = 0;
              break;
          }

          break;
        case "string":
          if (obj[key] instanceof Date) {
            copy[key] = obj[key].toISOString();
            break;
          }

          switch (typeof obj[key]) {
            case "string":
              copy[key] = obj[key];
              break;
            case "number":
              copy[key] = obj[key].toString();
              break;
            case "boolean":
              copy[key] = obj[key] ? "true" : "false";
              break;
            case "object":
              try {
                copy[key] = JSON.stringify(obj[key]);
              } catch {
                // Ignore
              }
              break;
            default:
              copy[key] = String(obj[key]);
              break;
          }
          break;
        case "object":
          if (typeof obj[key] !== "object" || obj[key] === null) {
            copy[key] = {};
          }
          break;
        case "undefined":
          delete copy[key];
          break;
      }
    }

    if (!set.has(typeof copy[key] as Types)) {
      delete copy[key];
    }
  });

  return copy as never;
};

export class Objects {
  static removeProperties<T extends Record<string, unknown>, K extends keyof T>(
    obj: T,
    ...keys: K[]
  ): Omit<T, K> {
    const result = cloneDeep(obj);
    keys.forEach((key) => {
      delete result[key];
    });
    return result;
  }

  static readonly fromEntries: <
    const T extends ReadonlyArray<readonly [PropertyKey, unknown]>,
  >(
    entries: T,
  ) => FromEntries<T> = globalThis.Object.fromEntries as <
    const T extends ReadonlyArray<readonly [PropertyKey, unknown]>,
  >(
    entries: T,
  ) => FromEntries<T>;

  static readonly entries = globalThis.Object.entries as <T extends object>(
    obj: T,
  ) => StrictEntries<T>;

  static readonly values = globalThis.Object.values as <T extends object>(
    obj: T,
  ) => StrictValues<T>;

  static readonly keys = globalThis.Object.keys as <T extends object>(
    obj: T,
  ) => StrictKeys<T>;

  static readonly changeType = changeType;
}
