import type {
  IShutdownLogger,
  ShutdownOptions,
  ShutdownPriority,
  IGracefullyShutdown,
  ShutdownExitHandler,
  ShutdownCleanupFunction,
} from "@types";
import { Timers } from "@commonSrc/both/timer";
import humanizeDuration from "humanize-duration";

export class GracefullyShutdown implements IGracefullyShutdown {
  #isShuttingDown = false;

  #timeoutMs: number;

  #logger: IShutdownLogger;

  #onExit: ShutdownExitHandler;

  #tasks: Record<
    ShutdownPriority,
    Array<{
      func: ShutdownCleanupFunction;
      name: string;
    }>
  > = {
    LOW: [],
    HIGH: [],
    NORMAL: [],
  };

  /**
   * Indicates whether the shutdown sequence is currently in progress.
   */
  public get isShuttingDown(): boolean {
    return this.#isShuttingDown;
  }

  /**
   * Registers a cleanup task to be executed during graceful shutdown.
   *
   * @param func Asynchronous or synchronous cleanup task.
   * @param name Descriptive name of the subsystem or operation.
   * @param priority Execution tier (HIGH, NORMAL, LOW). Defaults to NORMAL.
   */
  public addFunction(
    func: ShutdownCleanupFunction,
    name: string,
    priority: ShutdownPriority = "NORMAL",
  ): void {
    if (this.#isShuttingDown) {
      this.#logger.warn(
        `Cannot add function "${name}" because shutdown is already in progress.`,
      );
      return;
    }

    this.#tasks[priority].push({ func, name });
    this.#logger.log(
      `Function added to gracefully shutdown [${priority}]: ${name}`,
    );
  }

  /**
   * Initiates the graceful shutdown workflow, executing registered tasks in priority order.
   *
   * @param exitCode Final exit code to pass to the exit handler. Defaults to 0.
   */
  public async shutdown(exitCode = 0): Promise<void> {
    if (this.#isShuttingDown) return;
    this.#isShuttingDown = true;

    this.#logger.log("Gracefully shutting down...");

    let isTimedOut = false;
    let timer: number | null = null;

    const timeoutPromise = new Promise<void>((resolve) => {
      const timeoutId = Timers.setTimeout(() => {
        isTimedOut = true;
        this.#logger.error(
          `Graceful shutdown timed out after ${this.#timeoutMs}ms. Forcing process exit.`,
        );
        void this.#onExit(1);
        resolve();
      }, this.#timeoutMs);

      timer = timeoutId;
    });

    const tasksPromise = (async () => {
      const tiers: ShutdownPriority[] = ["HIGH", "NORMAL", "LOW"];

      let t: number;
      for (const tier of tiers) {
        const tasksInTier = this.#tasks[tier];

        for (const { func, name } of tasksInTier) {
          if (isTimedOut) return;

          try {
            t = Date.now();
            this.#logger.log(`Executing [${tier}] function: ${name}`);

            await func();

            this.#logger.log(
              `Function [${tier}] executed: ${name} in ${humanizeDuration(
                Date.now() - t,
                { units: ["s", "ms"], round: true },
              )}`,
            );
          } catch (error) {
            this.#logger.error(`Error in [${tier}] function "${name}":`, error);
          }
        }
      }
    })();

    await Promise.race([tasksPromise, timeoutPromise]);

    if (timer) Timers.clearTimeout(timer);

    if (isTimedOut) return;

    this.#logger.log("Gracefully shut down successfully.");
    await this.#onExit(exitCode);
  }

  /**
   * Creates a new GracefullyShutdown coordinator instance.
   *
   * @param options Configuration options including timeout, custom logger, and exit handler.
   */
  constructor(options: ShutdownOptions = {}) {
    this.#timeoutMs = options.timeoutMs ?? 10000;
    this.#logger = options.logger ?? console;
    this.#onExit = options.onExit ?? ((code: number) => process.exit(code));

    if (options.registerSignals === false) return;
    const listener = async () => {
      await this.shutdown(0);
    };

    const events: NodeJS.Signals[] = ["SIGHUP", "SIGINT", "SIGTERM"];

    events.forEach((event) => {
      process.on(event, listener);
    });
  }
}
