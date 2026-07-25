import { Timers } from "../../both/timer";
import { it, expect, describe, jest } from "@jest/globals";

let i = 0;

const waitUntilNumberIs = async (target: number): Promise<void> => {
  while (i !== target) await Timers.sleep(10);
};

describe("Timers", () => {
  it("should wait for the specified duration using sleep", async () => {
    await waitUntilNumberIs(0);

    const start = Date.now();
    await Timers.sleep(100);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(100);

    i++;
  });

  it("should set and clear a timeout", async () => {
    await waitUntilNumberIs(1);
    jest.useFakeTimers();

    const callback = jest.fn();
    const timeoutId = Timers.setTimeout(callback, 100);
    expect(timeoutId).toBeDefined();

    Timers.clearTimeout(timeoutId);
    jest.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();

    i++;
  });

  it("should set and clear an interval", async () => {
    await waitUntilNumberIs(2);

    const callback = jest.fn();
    const intervalId = Timers.setInterval(callback, 100);
    expect(intervalId).toBeDefined();
    Timers.clearInterval(intervalId);
    jest.advanceTimersByTime(300);
    expect(callback).not.toHaveBeenCalled();

    i++;
  });

  it("should clear all timeouts and intervals", async () => {
    await waitUntilNumberIs(3);

    const timeoutCallback = jest.fn();
    const intervalCallback = jest.fn();

    const timeoutId = Timers.setTimeout(timeoutCallback, 100);
    const intervalId = Timers.setInterval(intervalCallback, 100);
    expect(timeoutId).toBeDefined();
    expect(intervalId).toBeDefined();

    Timers.clearAll();
    jest.advanceTimersByTime(300);
    expect(timeoutCallback).not.toHaveBeenCalled();
    expect(intervalCallback).not.toHaveBeenCalled();

    i++;
  });

  it("should handle multiple timeouts and intervals", async () => {
    await waitUntilNumberIs(4);

    const timeoutCallback1 = jest.fn();
    const timeoutCallback2 = jest.fn();
    const intervalCallback1 = jest.fn();
    const intervalCallback2 = jest.fn();

    const timeoutId1 = Timers.setTimeout(timeoutCallback1, 100);
    const timeoutId2 = Timers.setTimeout(timeoutCallback2, 200);
    const intervalId1 = Timers.setInterval(intervalCallback1, 100);
    const intervalId2 = Timers.setInterval(intervalCallback2, 200);
    expect(timeoutId1).toBeDefined();
    expect(timeoutId2).toBeDefined();
    expect(intervalId1).toBeDefined();
    expect(intervalId2).toBeDefined();

    Timers.clearTimeout(timeoutId1);
    Timers.clearInterval(intervalId1);
    jest.advanceTimersByTime(300);
    expect(timeoutCallback1).not.toHaveBeenCalled();
    expect(timeoutCallback2).toHaveBeenCalled();
    expect(intervalCallback1).not.toHaveBeenCalled();
    expect(intervalCallback2).toHaveBeenCalled();

    Timers.clearAll();
    jest.advanceTimersByTime(300);
    expect(timeoutCallback2).toHaveBeenCalledTimes(1);
    expect(intervalCallback2).toHaveBeenCalledTimes(3);

    i++;
  }, 10000);

  it("should handle edge cases for timeouts and intervals", async () => {
    await waitUntilNumberIs(5);

    const callback = jest.fn();
    const timeoutId = Timers.setTimeout(callback, 0);
    const intervalId = Timers.setInterval(callback, 0);
    expect(timeoutId).toBeDefined();
    expect(intervalId).toBeDefined();

    Timers.clearTimeout(timeoutId);
    Timers.clearInterval(intervalId);
    jest.advanceTimersByTime(100);
    expect(callback).not.toHaveBeenCalled();

    i++;
  }, 10000);
});
