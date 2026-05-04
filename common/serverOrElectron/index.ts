export * from "./fetch.ts";
export * from "./images.ts";
export * from "../both/index.ts";

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
