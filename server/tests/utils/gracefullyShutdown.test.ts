import {
  it,
  jest,
  expect,
  describe,
  afterEach,
  beforeEach,
} from "@jest/globals";
import { GracefullyShutdown } from "@common";
import type { IShutdownLogger } from "@types";

describe("GracefullyShutdown Coordinator", () => {
  let mockLogger: IShutdownLogger;
  let exitMock: jest.Mock<(code: number) => Promise<void> | void>;

  beforeEach(() => {
    jest.useFakeTimers();
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    exitMock = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Idempotency (US3)", () => {
    it("should only execute registered tasks once even when shutdown is invoked multiple times concurrently", async () => {
      const coordinator = new GracefullyShutdown({
        logger: mockLogger,
        onExit: exitMock,
        registerSignals: false,
      });

      const task = jest.fn(async () => {});
      coordinator.addFunction(task, "Task 1");

      expect(coordinator.isShuttingDown).toBe(false);

      const promise1 = coordinator.shutdown(0);
      const promise2 = coordinator.shutdown(0);

      expect(coordinator.isShuttingDown).toBe(true);

      await Promise.all([promise1, promise2]);

      expect(task).toHaveBeenCalledTimes(1);
      expect(exitMock).toHaveBeenCalledTimes(1);
      expect(exitMock).toHaveBeenCalledWith(0);
    });

    it("should reject task registration once shutdown is already in progress", async () => {
      const coordinator = new GracefullyShutdown({
        logger: mockLogger,
        onExit: exitMock,
        registerSignals: false,
      });

      const lateTask = jest.fn();
      const shutdownPromise = coordinator.shutdown(0);

      coordinator.addFunction(lateTask, "Late Task");
      await shutdownPromise;

      expect(lateTask).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("already in progress"),
      );
    });
  });

  describe("Safety Timeout (US3)", () => {
    it("should force exit with code 1 when a task hangs past timeoutMs", async () => {
      const coordinator = new GracefullyShutdown({
        timeoutMs: 1000,
        logger: mockLogger,
        onExit: exitMock,
        registerSignals: false,
      });

      const hungTask = jest.fn(
        () =>
          new Promise<void>(() => {
            // Intentionally never resolves
          }),
      );

      coordinator.addFunction(hungTask, "Hung Task");

      const shutdownPromise = coordinator.shutdown(0);

      jest.advanceTimersByTime(1001);

      await shutdownPromise;

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("timed out after 1000ms"),
      );
      expect(exitMock).toHaveBeenCalledWith(1);
    });
  });

  describe("Priority Tiers and Execution Ordering (US4)", () => {
    it("should execute tasks strictly by tier (HIGH -> NORMAL -> LOW) and FIFO within tiers", async () => {
      const coordinator = new GracefullyShutdown({
        logger: mockLogger,
        onExit: exitMock,
        registerSignals: false,
      });

      const executionOrder: string[] = [];

      coordinator.addFunction(
        () => {
          executionOrder.push("LOW_1");
        },
        "Low Priority Task 1",
        "LOW",
      );

      coordinator.addFunction(
        () => {
          executionOrder.push("HIGH_1");
        },
        "High Priority Task 1",
        "HIGH",
      );

      coordinator.addFunction(
        () => {
          executionOrder.push("NORMAL_1");
        },
        "Normal Priority Task 1",
        "NORMAL",
      );

      coordinator.addFunction(
        () => {
          executionOrder.push("HIGH_2");
        },
        "High Priority Task 2",
        "HIGH",
      );

      coordinator.addFunction(
        () => {
          executionOrder.push("LOW_2");
        },
        "Low Priority Task 2",
        "LOW",
      );

      await coordinator.shutdown(0);

      expect(executionOrder).toEqual([
        "HIGH_1",
        "HIGH_2",
        "NORMAL_1",
        "LOW_1",
        "LOW_2",
      ]);
      expect(exitMock).toHaveBeenCalledWith(0);
    });
  });

  describe("Error Isolation (US4)", () => {
    it("should isolate errors in failing tasks and execute all remaining tasks to completion", async () => {
      const coordinator = new GracefullyShutdown({
        logger: mockLogger,
        onExit: exitMock,
        registerSignals: false,
      });

      const task1 = jest.fn(() => {
        throw new Error("Simulated failure in High Task");
      });
      const task2 = jest.fn(async () => {});
      const task3 = jest.fn(async () => {});

      coordinator.addFunction(task1, "Failing High Task", "HIGH");
      coordinator.addFunction(task2, "Normal Task", "NORMAL");
      coordinator.addFunction(task3, "Low Task", "LOW");

      await coordinator.shutdown(0);

      expect(task1).toHaveBeenCalledTimes(1);
      expect(task2).toHaveBeenCalledTimes(1);
      expect(task3).toHaveBeenCalledTimes(1);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error in [HIGH] function \"Failing High Task\""),
        expect.any(Error),
      );
      expect(exitMock).toHaveBeenCalledWith(0);
    });
  });
});
