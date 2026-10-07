import _BackgroundTimer from "react-native-background-timer";

const setTimeout = (fn: () => unknown, ms: number) =>
  _BackgroundTimer.setTimeout(fn, ms);
const setInterval = (fn: () => unknown, ms: number) =>
  _BackgroundTimer.setInterval(fn, ms);

const clearTimeout = (id: number) => _BackgroundTimer.clearTimeout(id);
const clearInterval = (id: number) => _BackgroundTimer.clearInterval(id);

globalThis.setTimeout = setTimeout as never;
globalThis.setInterval = setInterval as never;
globalThis.clearTimeout = clearTimeout as never;
globalThis.clearInterval = clearInterval as never;
