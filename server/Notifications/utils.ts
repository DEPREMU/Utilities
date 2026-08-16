import { Logger } from "@common";
import chalk from "chalk";
import { cloneDeep } from "lodash";

export const PAGE_SIZE = 10;

export const getPagination = <T>(
  callback: (skip: number, take: number) => T,
  pageSize: number = PAGE_SIZE,
) => {
  let page = 0;

  const getNext = () => callback(page++ * pageSize, pageSize);

  const reset = () => {
    page = 0;
  };

  const getCurrentPage = () => page;

  const setPage = (newPage: number) => {
    page = newPage;
  };

  return { reset, getNext, setPage, getCurrentPage };
};

interface OptionsIntervalTimer {
  /**
   * Name for logging purposes
   */
  name?: string;
  /**
   * Catch promise
   * @default true
   */
  catchPromise?: boolean;
  /**
   * Log catch promise
   * @default false
   */
  logCatchPromise?: boolean;
  /**
   * Execute initial
   * @default true
   */
  executeInitial?: boolean;
}

export class IntervalTimer {
  private static DEFAULT_OPTIONS: OptionsIntervalTimer = {
    name: "",
    catchPromise: true,
    executeInitial: true,
    logCatchPromise: false,
  };

  #options: OptionsIntervalTimer = cloneDeep(IntervalTimer.DEFAULT_OPTIONS);
  #promise: Promise<void> | null = null;
  #timer: ReturnType<typeof setInterval> | null = null;
  #lastExecFinished: number = 0;

  #callback: () => Promise<void>;
  #interval: number;

  constructor(
    callback: () => Promise<void>,
    interval: number,
    options?: OptionsIntervalTimer,
  );
  constructor(callback: () => Promise<void>, interval: number, name: string);
  constructor(
    callback: () => Promise<void>,
    interval: number,
    options?: OptionsIntervalTimer | string,
  ) {
    if (typeof options === "string") this.#options.name = options;
    else if (options) this.#options = { ...this.#options, ...options };
    else this.#options.name = `Unknown-${Date.now()}`;

    this.#callback = callback;
    this.#interval = interval;

    if (this.#options.executeInitial) this.start();
  }

  async #logError(error: Error) {
    if (!this.#options.logCatchPromise) return;
    Logger.error(chalk.red(`Error in ${this.#options.name} interval:`), error);
  }

  async #executeFunction() {
    if (this.#promise || Date.now() - this.#lastExecFinished < this.#interval)
      return;
    else {
      this.#promise = this.#callback().catch(
        this.#options.catchPromise ? this.#logError : null,
      );
    }

    await this.#promise;
    this.#promise = null;

    this.#lastExecFinished = Date.now();
  }

  public async start() {
    if (this.#timer) return;

    Logger.log(chalk.blue(`Starting ${this.#options.name} interval...`));

    await this.#executeFunction();
    this.#timer = setInterval(() => this.#executeFunction(), this.#interval);
  }

  public stop() {
    if (!this.#timer) return;

    clearInterval(this.#timer);
    this.#timer = null;
  }
}
