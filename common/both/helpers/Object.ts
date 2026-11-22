import set from "lodash/set";
import get from "lodash/get";
import merge from "lodash/merge";
import cloneDeep from "lodash/cloneDeep";
import { Arrays } from "./Array";
import isEqualWith from "lodash/isEqualWith";
import isPlainObject from "lodash/isPlainObject";
import type { TypeOfJS } from "@types";
import { Get, Paths, PartialDeep, OmitDeep } from "type-fest";

type FromEntries<T extends ReadonlyArray<readonly [PropertyKey, unknown]>> = {
  [E in T[number] as E[0]]: E[1];
};

type StrictEntries<T> = Array<{ [K in keyof T]: [K, T[K]] }[keyof T]>;
type StrictKeys<T> = Array<keyof T>;
type StrictValues<T> = Array<T[keyof T]>;

type TypesOfValue = keyof Omit<TypeOfJS, "function" | "symbol" | "bigint">;

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
  M extends Partial<Record<keyof T, TypesOfValue | readonly TypesOfValue[]>>,
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
  const T extends Record<string, unknown>,
  M extends Partial<Record<keyof T, TypesOfValue | TypesOfValue[]>>,
>(
  obj: T,
  map: M,
) => Converted<T, M>;

const changeType: ChangeType = (obj, newType) => {
  const copy = cloneDeep(obj) as Record<string, unknown>;

  Object.keys(newType).forEach((key) => {
    if (!(key in copy)) return;

    const set = new Set<TypesOfValue>(
      Arrays.convertToArray(newType[key]) as TypesOfValue[],
    );

    for (const type of set) {
      if (set.has(typeof copy[key] as TypesOfValue)) return;

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

    if (!set.has(typeof copy[key] as TypesOfValue)) {
      delete copy[key];
    }
  });

  return copy as never;
};

function isEqualObj<const T extends object>(obj1: T, obj2: unknown): obj2 is T {
  return isEqualWith(obj1, obj2, (val1, val2) => {
    if (isPlainObject(val1) !== isPlainObject(val2)) return false;
    if (!isPlainObject(val1) && !isPlainObject(val2)) return true;

    return undefined;
  });
}

type UnionGet<T, K extends string> = T extends unknown
  ? unknown extends Get<T, K>
    ? undefined
    : Get<T, K>
  : never;

function getValue<const T extends object, K extends Paths<T> & string>(
  obj: T,
  key: K,
): UnionGet<T, K>;
function getValue<
  const T extends object,
  K extends Paths<T> & string,
  V extends NonNullable<UnionGet<T, K>>,
>(obj: T, key: K, fallbackValue: V): NonNullable<UnionGet<T, K>> | V;
function getValue<const T extends object>(
  obj: T,
  key: string,
  fallbackValue?: unknown,
): unknown {
  return get(obj, key, fallbackValue);
}

export class Objects {
  static removeProperties<const T extends object, const K extends Paths<T>>(
    obj: T,
    ...keys: K[]
  ): OmitDeep<T, K> {
    const result = cloneDeep(obj);

    keys.forEach((key) => {
      Objects.setValue(result, key as never, undefined as never);
    });

    return result as never;
  }

  static readonly fromEntries = globalThis.Object.fromEntries as <
    const T extends ReadonlyArray<readonly [PropertyKey, unknown]>,
  >(
    entries: T,
  ) => FromEntries<T>;

  static readonly entries = globalThis.Object.entries as <
    const T extends object,
  >(
    obj: T,
  ) => StrictEntries<T>;

  static readonly values = globalThis.Object.values as <const T extends object>(
    obj: T,
  ) => StrictValues<T>;

  static readonly keys = globalThis.Object.keys as <const T extends object>(
    obj: T,
  ) => StrictKeys<T>;

  /**
   * Deep-clones an object and converts specified top-level properties to the target runtime types.
   *
   * How it works:
   * - Clones `obj` using `cloneDeep` so the original object is not mutated.
   * - For each key in `map` that exists on the object, normalizes the target type(s) into a `Set`
   *   and skips conversion if `typeof copy[key]` is already one of the allowed types.
   * - Converts values according to each target type (`"boolean"`, `"number"`, `"string"`, `"object"`,
   *   or `"undefined"` to delete the key), supporting `Date` instances, `.toNumber()` objects, and
   *   `JSON.stringify` for objects.
   * - Deletes the key if none of the target types produce a matching `typeof` result.
   *
   * @param obj - Source object whose properties will be converted.
   * @param map - Mapping of object keys to a target type or array of allowed types.
   * @returns A new cloned object with converted property types.
   *
   * @example
   * ```ts
   * const parsed = Objects.changeType(
   *   { count: "42", active: "true", createdAt: new Date(), temp: "remove" },
   *   { count: "number", active: "boolean", createdAt: "string", temp: "undefined" },
   * );
   * // { count: 42, active: true, createdAt: "2026-...", }
   * ```
   */
  static readonly changeType = changeType;

  /**
   * Safely retrieves a property value from an object using a type-safe nested path.
   *
   * How it works:
   * - Wraps `lodash/get` with `Paths<T>` path validation and `UnionGet<T, K>` return type inference.
   * - Traverses `obj` along `key` and returns the resolved value, or `fallbackValue` when the
   *   resolved value is `undefined`.
   *
   * @param obj - Source object to read from.
   * @param key - Dot/bracket-notation path to the target property.
   * @param fallbackValue - Optional value returned when the resolved property is `undefined`.
   * @returns The value at `key`, or `fallbackValue` if provided and the property is `undefined`.
   *
   * @example
   * ```ts
   * const user = { profile: { name: "Alice" } };
   * const name = Objects.getValue(user, "profile.name"); // "Alice"
   * const role = Objects.getValue(settings, "user.role", "guest");
   * ```
   */
  static readonly getValue = getValue;

  /**
   * Sets a value at a type-safe nested path on an object in place.
   *
   * How it works:
   * - Wraps `lodash/set` with `Paths<T>` and `Get<T, P>` type constraints.
   * - Walks `path` on `obj` (creating missing intermediate objects or arrays as needed) and
   *   assigns `value` directly on `obj`, mutating it.
   *
   * @param obj - Target object to mutate.
   * @param path - Dot/bracket-notation path to the property to set.
   * @param value - Value to assign at `path`, typed to match the target property.
   * @returns The mutated `obj` reference.
   *
   * @example
   * ```ts
   * const state = { user: { name: "Alice" } };
   * Objects.setValue(state, "user.name", "Bob");
   * ```
   */
  static readonly setValue = set as <
    const T extends object,
    P extends Paths<T> & string,
  >(
    obj: T,
    path: P,
    value: Get<T, P>,
  ) => T;

  /**
   * Recursively merges partial nested values into a target object in place.
   *
   * How it works:
   * - Wraps `lodash/merge` with `PartialDeep<T>` typing for `values`.
   * - Recursively merges own enumerable properties of `values` into `obj` (mutating `obj`).
   * - Existing defined properties on `obj` are preserved when the corresponding source property
   *   is `undefined`.
   *
   * @param obj - Destination object to mutate.
   * @param values - Deep-partial object containing properties to merge into `obj`.
   * @returns The mutated `obj` typed as `T & V`.
   *
   * @example
   * ```ts
   * const config = { enabled: true, nested: { retries: 3, timeout: 1000 } };
   * Objects.merge(config, { nested: { timeout: 2000 } });
   * // config is { enabled: true, nested: { retries: 3, timeout: 2000 } }
   * ```
   */
  static readonly merge = merge as <
    const T extends object,
    V extends PartialDeep<T>,
  >(
    obj: T,
    values: V,
  ) => T & V;

  /**
   * Checks whether `obj2` has the same nested plain-object key structure as `obj1`, ignoring leaf values.
   *
   * How it works:
   * - Uses `lodash/isEqualWith` with a customizer checking `isPlainObject` on both sides:
   *   - Returns `false` if one side is a plain object and the other is not.
   *   - Returns `true` if neither side is a plain object (primitives, arrays, `null`, etc.),
   *     treating differing leaf values as structurally equal.
   *   - Returns `undefined` when both sides are plain objects so `isEqualWith` recurses into their keys.
   * - Narrows `obj2` to `T` when it returns `true`.
   *
   * @param obj1 - Reference object defining the expected structure.
   * @param obj2 - Unknown value to compare structurally against `obj1`.
   * @returns `true` if `obj2` matches the plain-object key structure of `obj1`, acting as a type guard.
   *
   * @example
   * ```ts
   * const defaults = { enabled: true, limits: { max: 10 } };
   * const stored: unknown = JSON.parse(raw);
   * if (Objects.isEqualObj(defaults, stored)) {
   *   // `stored` is narrowed to typeof defaults
   * }
   * ```
   */
  static readonly isEqualObj = isEqualObj;
}
