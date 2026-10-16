import { Timers } from "../both/timer";

export * from "./fs";
export * from "./Task";
export * from "../both";
export * from "./logger";
export * from "./piscina";
export * from "./express";
export * from "./memoryMonitor";
export * from "./gracefullyShutdown";
export * from "./ThirdPartyStateManager/index";

type Function = () => unknown;

export const onDebounce = (
  fn: Function,
  delay: number,
): {
  cleanup: () => void;
} => {
  let timeoutId: number | null = null;

  timeoutId = Timers.setTimeout(() => {
    timeoutId = null;
    fn?.();
  }, delay);

  return {
    cleanup: () => {
      if (!timeoutId) return;
      Timers.clearTimeout(timeoutId);
    },
  };
};
