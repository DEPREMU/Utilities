import { ClearTimeoutFunction, SetTimeoutFunction } from "@types";

export class Timers {
  static #timeouts: Set<number> = new Set();
  static #intervals: Set<number> = new Set();

  /**
   * Clears all active timeouts and intervals. Useful for cleanup, especially in testing or when unmounting components.
   * This method ensures that all timers are properly cleared to prevent memory leaks or unintended side effects.
   * Note: This will clear all timers created using the Timers class. If there are timers created using the original setTimeout or setInterval, they will not be tracked and thus not cleared by this method.
   * Use with caution if you have timers that are not managed by this class, as they will not be affected.
   * It's recommended to use the Timers class for all timer-related operations in your application to ensure proper tracking and cleanup.
   */
  static readonly clearAllTimeouts = () => {
    this.#timeouts.forEach((id) => {
      global.clearTimeout(id);
    });
    this.#timeouts.clear();
  };

  /**
   * Clears all active intervals. This is particularly useful for ensuring that no intervals are left running unintentionally, which can lead to memory leaks or unexpected behavior in your application.
   * Similar to clearAllTimeouts, this method will only clear intervals that were created using the Timers class. If there are intervals created using the original setInterval, they will not be tracked and thus not cleared by this method.
   * It's important to use the Timers class for all interval-related operations in your application to ensure that they are properly tracked and can be cleared when necessary.
   * Use this method during cleanup phases, such as when unmounting components or when you want to reset the state of your application without leaving any intervals running in the background.
   */
  static readonly clearAllIntervals = () => {
    this.#intervals.forEach((id) => {
      global.clearInterval(id);
    });
    this.#intervals.clear();
  };

  /**
   * Clears all active timeouts and intervals managed by the Timers class. This is a convenient method for performing a comprehensive cleanup of all timers in one call, ensuring that no timers are left running unintentionally.
   * It is especially useful in scenarios where you want to reset the state of your application or when unmounting components to prevent memory leaks and unintended side effects.
   * Note: This method will only clear timers that were created using the Timers class. If there are timers created using the original setTimeout or setInterval, they will not be tracked and thus not cleared by this method.
   * For best results, use the Timers class for all timer-related operations in your application to ensure proper tracking and cleanup.
   */
  static readonly clearAll = () => {
    this.clearAllTimeouts();
    this.clearAllIntervals();
  };

  static readonly originalSetTimeout = global.setTimeout.bind(global);
  static readonly originalSetInterval = global.setInterval.bind(global);
  static readonly originalClearTimeout = global.clearTimeout.bind(global);
  static readonly originalClearInterval = global.clearInterval.bind(global);

  static setTimeout: SetTimeoutFunction = (...args) => {
    const id = global.setTimeout(() => {
      this.#timeouts.delete(id);

      (args[0] as (...args: unknown[]) => void)?.(...args.slice(2));
    }, args[1]) as never;

    this.#timeouts.add(id);
    return id;
  };

  static setInterval: SetTimeoutFunction = (...args) => {
    const id = global.setInterval(() => {
      this.#intervals.delete(id);

      (args[0] as (...args: unknown[]) => void)?.(...args.slice(2));
    }, args[1]) as never;

    this.#intervals.add(id);
    return id;
  };

  static clearTimeout: ClearTimeoutFunction = (...ids) => {
    ids.forEach((id) => {
      if (!id) return;

      this.#timeouts.delete(id);
      global.clearTimeout(id);
    });
  };

  static clearInterval: ClearTimeoutFunction = (...ids) => {
    ids.forEach((id) => {
      if (!id) return;

      this.#intervals.delete(id);
      global.clearInterval(id);
    });
  };

  /**
   * Creates a promise that resolves after a specified number of milliseconds.
   * This is a utility function for asynchronous waiting in your application.
   * @param ms The number of milliseconds to wait before resolving the promise.
   * @returns A promise that resolves after the specified time.
   */
  static readonly sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => global.setTimeout(resolve, ms));

  /**
   * Creates a promise that resolves after a specified number of milliseconds using the original setTimeout.
   * This is useful when you want to use the native setTimeout behavior instead of the Timers class.
   * If global.setTimeout is the same as the original setTimeout, this method will behave the same as sleep. However, if global.setTimeout has been overridden (e.g., by a testing library), this method will ensure that it uses the original setTimeout implementation.
   * @param ms The number of milliseconds to wait before resolving the promise.
   * @returns A promise that resolves after the specified time.
   */
  static readonly sleepOriginal = (ms: number): Promise<void> =>
    new Promise((resolve) => Timers.originalSetTimeout(resolve, ms));
}
