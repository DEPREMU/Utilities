import { Falsy } from "./API";

type ReturnTimeout = number;
type ValidClearTimeout = ReturnTimeout | Falsy;

export type SetTimeoutFunction = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay?: number,
  ...args: T
) => ReturnTimeout;

export type ClearTimeoutFunction = (...ids: ValidClearTimeout[]) => void;
