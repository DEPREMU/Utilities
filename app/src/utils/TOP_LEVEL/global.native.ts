import _BackgroundTimer from "react-native-background-timer";

const setTimeout = (
  fn: (...args: unknown[]) => unknown,
  ms: number,
  ...args: unknown[]
) => _BackgroundTimer.setTimeout(() => fn(...args), ms);
const setInterval = (
  fn: (...args: unknown[]) => unknown,
  ms: number,
  ...args: unknown[]
) => _BackgroundTimer.setInterval(() => fn(...args), ms);

const clearTimeout = (id: number) => _BackgroundTimer.clearTimeout(id);
const clearInterval = (id: number) => _BackgroundTimer.clearInterval(id);

globalThis.setTimeout = setTimeout as never;
globalThis.setInterval = setInterval as never;
globalThis.clearTimeout = clearTimeout as never;
globalThis.clearInterval = clearInterval as never;
