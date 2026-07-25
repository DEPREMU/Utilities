import { InstanceManager } from "../../../both/classes/instanceManager";
import { describe, test, expect, jest } from "@jest/globals";

describe("InstanceManager", () => {
  test("should create an instance and destroy it after the specified time", () => {
    const deleteInstanceAfter = 1000; // 1 second
    const destroyMock = jest.fn();
    const getClass = jest.fn(() => ({
      destroy: destroyMock,
    }));

    const instanceManager = new InstanceManager(getClass, deleteInstanceAfter);

    // Access the instance to create it
    const instance = instanceManager.instance;
    expect(getClass).toHaveBeenCalledTimes(1);
    expect(instance).toBeDefined();

    // Start the timer to destroy the instance after the specified time
    instanceManager.startTimer();

    // Wait for the specified time and check if the instance is destroyed
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(destroyMock).toHaveBeenCalledTimes(1);
        resolve();
      }, deleteInstanceAfter + 100); // Wait a bit longer than the specified time
    });
  });

  test("should not destroy the instance if it is accessed before the timer expires", () => {
    const deleteInstanceAfter = 1000;
    const destroyMock = jest.fn();
    const getClass = jest.fn(() => ({
      destroy: destroyMock,
    }));

    const instanceManager = new InstanceManager(getClass, deleteInstanceAfter);

    // Access the instance to create it
    const instance = instanceManager.instance;
    expect(getClass).toHaveBeenCalledTimes(1);
    expect(instance).toBeDefined();

    // Start the timer to destroy the instance after the specified time
    instanceManager.startTimer();

    // Access the instance again before the timer expires
    setTimeout(() => {
      const instanceAgain = instanceManager.instance;
      expect(instanceAgain).toBe(instance);
    }, deleteInstanceAfter / 2);

    // Wait for the specified time and check if the instance is destroyed
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(destroyMock).toHaveBeenCalledTimes(0);
        resolve();
      }, deleteInstanceAfter + 100);
    });
  });
});
