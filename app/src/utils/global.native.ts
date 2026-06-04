import _BackgroundTimer from "react-native-background-timer";
import type { ClearTimeoutFunction, SetTimeoutFunction } from "@types";

const bgSetTimeout: SetTimeoutFunction = (fn, delay, ...args) => {
  return _BackgroundTimer.setTimeout(() => fn(...args), delay ?? 1);
};

const bgClearTimeout: ClearTimeoutFunction = (...ids) => {
  ids.forEach((id) => {
    if (typeof id === "number") _BackgroundTimer.clearTimeout(id);
  });
};

const bgSetInterval: SetTimeoutFunction = (fn, delay, ...args) => {
  return _BackgroundTimer.setInterval(() => fn(...args), delay ?? 1);
};

const bgClearInterval: ClearTimeoutFunction = (...ids) => {
  ids.forEach((id) => {
    if (typeof id === "number") _BackgroundTimer.clearInterval(id);
  });
};

global.setTimeout = bgSetTimeout as never;
global.setInterval = bgSetInterval as never;
global.clearTimeout = bgClearTimeout as never;
global.clearInterval = bgClearInterval as never;
