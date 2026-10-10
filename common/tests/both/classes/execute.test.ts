import { ExecuteOnce } from "../../../both/classes/execute";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";

describe("ExecuteOnce", () => {
  beforeEach(() => {
    ExecuteOnce.clear();
  });

  describe("execute with default / saveData: false", () => {
    test("executes the function on the first call and returns its result", () => {
      const mockFn = jest.fn(() => "initial-result");

      const result = ExecuteOnce.execute("key-1", { saveData: false }, mockFn);

      expect(result).toBe("initial-result");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("does not re-execute on subsequent calls and returns true", () => {
      const mockFn = jest.fn(() => "first-run");

      const firstResult = ExecuteOnce.execute(
        "key-2",
        { saveData: false },
        mockFn,
      );
      const secondResult = ExecuteOnce.execute(
        "key-2",
        { saveData: false },
        mockFn,
      );
      const thirdResult = ExecuteOnce.execute(
        "key-2",
        { saveData: false },
        mockFn,
      );

      expect(firstResult).toBe("first-run");
      expect(secondResult).toBe(true);
      expect(thirdResult).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test("defaults saveData to false when options are omitted", () => {
      const mockFn = jest.fn(() => 42);

      const firstResult = ExecuteOnce.execute(
        "key-default-opts",
        undefined,
        mockFn,
      );
      const secondResult = ExecuteOnce.execute(
        "key-default-opts",
        undefined,
        mockFn,
      );

      expect(firstResult).toBe(42);
      expect(secondResult).toBe(true);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(ExecuteOnce.getExecuted("key-default-opts")).toBe(true);
    });
  });

  describe("argument passing", () => {
    test("passes arguments correctly to the executed function", () => {
      const mockFn = jest.fn(
        (a: number, b: string, c: boolean) => `${a}-${b}-${c}`,
      );

      const result = ExecuteOnce.execute(
        "key-args",
        { saveData: false },
        mockFn,
        10,
        "test",
        true,
      );

      expect(result).toBe("10-test-true");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith(10, "test", true);
    });
  });

  describe("execute with saveData: true", () => {
    test("stores and returns the computed result on subsequent calls", () => {
      const payload = { id: 1, name: "utilities" };
      const mockFn = jest.fn(() => payload);

      const firstResult = ExecuteOnce.execute(
        "key-save-data",
        { saveData: true },
        mockFn,
      );
      const secondResult = ExecuteOnce.execute(
        "key-save-data",
        { saveData: true },
        mockFn,
      );

      expect(firstResult).toBe(payload);
      expect(secondResult).toBe(payload);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(ExecuteOnce.getExecuted("key-save-data")).toBe(payload);
    });

    test("stores falsy return values correctly without re-executing", () => {
      const falsyCases = [
        { key: "falsy-false", value: false },
        { key: "falsy-zero", value: 0 },
        { key: "falsy-empty-string", value: "" },
        { key: "falsy-null", value: null },
        { key: "falsy-undefined", value: undefined },
      ];

      for (const { key, value } of falsyCases) {
        const mockFn = jest.fn(() => value);

        const firstResult = ExecuteOnce.execute(
          key,
          { saveData: true },
          mockFn,
        );
        const secondResult = ExecuteOnce.execute(
          key,
          { saveData: true },
          mockFn,
        );

        expect(firstResult).toBe(value);
        expect(secondResult).toBe(value);
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(ExecuteOnce.getExecuted(key)).toBe(value);
      }
    });
  });

  describe("asynchronous functions", () => {
    test("handles async function with saveData: false", async () => {
      const mockAsyncFn = jest.fn(async () => "async-data");

      const firstPromise = ExecuteOnce.execute(
        "async-no-save",
        { saveData: false },
        mockAsyncFn,
      );
      const firstResult = await firstPromise;
      const secondResult = ExecuteOnce.execute(
        "async-no-save",
        { saveData: false },
        mockAsyncFn,
      );

      expect(firstResult).toBe("async-data");
      expect(secondResult).toBe(true);
      expect(mockAsyncFn).toHaveBeenCalledTimes(1);
      expect(ExecuteOnce.getExecuted("async-no-save")).toBe(true);
    });

    test("handles async function with saveData: true and returns stored promise", async () => {
      const mockAsyncFn = jest.fn(async () => ({ status: "ok" }));

      const firstPromise = ExecuteOnce.execute(
        "async-save",
        { saveData: true },
        mockAsyncFn,
      );
      const secondPromise = ExecuteOnce.execute(
        "async-save",
        { saveData: true },
        mockAsyncFn,
      );

      const [firstResult, secondResult] = await Promise.all([
        firstPromise,
        secondPromise,
      ]);

      expect(firstResult).toEqual({ status: "ok" });
      expect(secondResult).toEqual({ status: "ok" });
      expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("multiple keys", () => {
    test("handles multiple independent keys separately", () => {
      const mockFn1 = jest.fn(() => "result-1");
      const mockFn2 = jest.fn(() => "result-2");

      const res1 = ExecuteOnce.execute("task-1", { saveData: true }, mockFn1);
      const res2 = ExecuteOnce.execute("task-2", { saveData: true }, mockFn2);

      expect(res1).toBe("result-1");
      expect(res2).toBe("result-2");
      expect(mockFn1).toHaveBeenCalledTimes(1);
      expect(mockFn2).toHaveBeenCalledTimes(1);

      expect(ExecuteOnce.getExecuted("task-1")).toBe("result-1");
      expect(ExecuteOnce.getExecuted("task-2")).toBe("result-2");
    });
  });

  describe("getExecuted", () => {
    test("returns undefined for a key that has not been executed", () => {
      expect(ExecuteOnce.getExecuted("unregistered-key")).toBeUndefined();
    });

    test("returns true for a key executed with saveData: false", () => {
      ExecuteOnce.execute("executed-false", { saveData: false }, () => "value");

      expect(ExecuteOnce.getExecuted("executed-false")).toBe(true);
    });

    test("returns the cached value for a key executed with saveData: true", () => {
      const data = { user: "alice" };
      ExecuteOnce.execute("executed-true", { saveData: true }, () => data);

      expect(ExecuteOnce.getExecuted("executed-true")).toBe(data);
    });
  });

  describe("clear", () => {
    test("clears recorded executions allowing re-execution", () => {
      const mockFn = jest.fn(() => "run-again");

      ExecuteOnce.execute("clear-key", { saveData: true }, mockFn);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(ExecuteOnce.getExecuted("clear-key")).toBe("run-again");

      ExecuteOnce.clear();

      expect(ExecuteOnce.getExecuted("clear-key")).toBeUndefined();

      const resultAfterClear = ExecuteOnce.execute(
        "clear-key",
        { saveData: true },
        mockFn,
      );
      expect(resultAfterClear).toBe("run-again");
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    test("clears all keys in the store", () => {
      ExecuteOnce.execute("k1", { saveData: false }, () => 1);
      ExecuteOnce.execute("k2", { saveData: true }, () => 2);

      ExecuteOnce.clear();

      expect(ExecuteOnce.getExecuted("k1")).toBeUndefined();
      expect(ExecuteOnce.getExecuted("k2")).toBeUndefined();
    });
  });

  describe("error handling", () => {
    test("does not mark key as executed if the function throws an error", () => {
      const failingFn = jest.fn(() => {
        throw new Error("execution failed");
      });
      const succeedingFn = jest.fn(() => "recovered");

      expect(() => {
        ExecuteOnce.execute("error-key", { saveData: true }, failingFn);
      }).toThrow("execution failed");

      expect(ExecuteOnce.getExecuted("error-key")).toBeUndefined();

      const result = ExecuteOnce.execute(
        "error-key",
        { saveData: true },
        succeedingFn,
      );
      expect(result).toBe("recovered");
      expect(succeedingFn).toHaveBeenCalledTimes(1);
    });
  });
});
