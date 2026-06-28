export * from "./fs.ts";
export * from "./express";
export * from "./Task.ts";
export * from "./logger.ts";
export * from "./piscina.ts";
export * from "../both/index.ts";
export * from "./memoryMonitor.ts";

type Function = () => unknown;

export const onDebounce = (
  fn: Function,
  delay: number,
): {
  cleanup: () => void;
} => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  timeoutId = setTimeout(() => {
    timeoutId = null;
    fn?.();
  }, delay);

  return {
    cleanup: () => {
      if (!timeoutId) return;
      clearTimeout(timeoutId);
    },
  };
};
