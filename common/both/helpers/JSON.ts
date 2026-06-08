import { Slice } from "@types";

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
    return sortObject(value as Record<string, unknown>);
  }

  return value;
};

/**
 * Sorts an array by getting valid representations of its elements.
 *
 * @param arr - The array to sort.
 * @returns The sorted array.
 */
export const sortArray = <T extends unknown[]>(arr: T): T => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(getValidValue).sort() as T;
};

/**
 * Sorts an object by getting valid representations of its values.
 *
 * @param obj - The object to sort.
 * @returns The sorted object.
 */
export const sortObject = <T extends Record<string, unknown>>(obj: T): T => {
  if (typeof obj !== "object" || obj === null) return obj;
  const keys = Object.keys(obj).sort((a, b) => (a > b ? 1 : -1));

  const sortedEntries = Object.fromEntries(
    keys.map((key) => {
      const valueKey = getValidValue(obj[key as keyof typeof obj]);

      return [key, valueKey];
    }),
  );
  return sortedEntries as T;
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

      return JSON.stringify(sortObject(value as Record<string, unknown>));
    }
    if (!value) return String(value);

    return JSON.stringify(value);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Error stringifying value:", error);
    return "notValid";
  }
};

const functionFallback = (functionName: string) => () =>
  // eslint-disable-next-line no-console
  console.log(
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

export const parseData = <T = object | null>(
  value: string | null,
): T | null => {
  let parsed: T;
  try {
    if (!value) return value as T;

    if (value.includes("<<Symbol>>") || value.includes("<<Function>>")) {
      const parsedValue = global.JSON.parse(value);

      return getCorrectParsed<T>(parsedValue);
    } else parsed = global.JSON.parse(value || "null") as T;
  } catch {
    parsed = value as T;
  }
  return parsed;
};

export const JSON = {
  parseData,
  stringifyData,
  parse: global.JSON.parse as unknown as <T>(
    value: string,
    ...args: Slice<Parameters<typeof global.JSON.parse>, 1>
  ) => T,
  stringify: global.JSON.stringify as <T>(
    value: T,
    ...args: Slice<Parameters<typeof global.JSON.stringify>, 1>
  ) => string,
} as const;
