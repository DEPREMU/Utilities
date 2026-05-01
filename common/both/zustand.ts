import type { StateFunction } from "@types";

const isFunction = <T>(
  value: T | StateFunction<T>,
): value is StateFunction<T> => {
  return typeof value === "function";
};

export const getValueState = <T>(
  funcOrValue: StateFunction<T> | T,
  get: () => T,
): T => {
  return isFunction(funcOrValue) ? funcOrValue(get()) : funcOrValue;
};
