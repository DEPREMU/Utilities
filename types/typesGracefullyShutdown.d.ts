/**
 * Priority tiers for ordered execution during graceful shutdown.
 * - HIGH: Ingress listeners, HTTP/WebSocket servers, mDNS advertising
 * - NORMAL: Background workers, queues, scheduled monitors, temp file cleanup
 * - LOW: Data persistence, Redis clients, database connections
 */
export type ShutdownPriority = "HIGH" | "NORMAL" | "LOW";

/**
 * Teardown callback function that can be synchronous or asynchronous.
 */
export type ShutdownCleanupFunction = () => Promise<unknown> | unknown;

/**
 * Structural interface for logging output during shutdown operations.
 */
export type IShutdownLogger = {
  log: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
};

/**
 * Custom exit callback for coordinating runtime termination.
 */
export type ShutdownExitHandler = (code: number) => Promise<void> | void;

/**
 * Options accepted by the GracefullyShutdown coordinator constructor.
 */
export type ShutdownOptions = {
  /**
   * Maximum safety timeout in milliseconds before forcing process exit.
   * @default 10000
   */
  timeoutMs?: number;

  /**
   * Custom logger instance. Defaults to global console.
   */
  logger?: IShutdownLogger;

  /**
   * Final exit callback invoked after all teardown functions finish or timeout occurs.
   * @default (code) => process.exit(code)
   */
  onExit?: ShutdownExitHandler;

  /**
   * Automatically bind process SIGINT and SIGTERM listeners.
   * @default true
   */
  registerSignals?: boolean;
};

/**
 * Interface contract for the GracefullyShutdown coordinator.
 */
export interface IGracefullyShutdown {
  /**
   * Register a teardown function with the coordinator.
   *
   * @param func Asynchronous or synchronous cleanup task.
   * @param name Descriptive name of the subsystem or operation.
   * @param priority Execution tier (HIGH, NORMAL, LOW). Defaults to NORMAL.
   */
  addFunction(
    func: ShutdownCleanupFunction,
    name: string,
    priority?: ShutdownPriority,
  ): void;

  /**
   * Initiate the coordinated graceful shutdown workflow.
   *
   * @param exitCode Final exit code to pass to the exit handler. Defaults to 0.
   */
  shutdown(exitCode?: number): Promise<void>;

  /**
   * Whether the shutdown process has been initiated.
   */
  readonly isShuttingDown: boolean;
}
