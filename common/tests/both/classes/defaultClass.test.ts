import { ServiceClass } from "../../../both/classes/defaultClass";
import { describe, test, expect } from "@jest/globals";

type TestEvents = {
  testEvent: (message: string) => void;
};

class TestService extends ServiceClass<TestEvents> {
  initCalls = 0;

  async _init(): Promise<void> {
    this.initCalls++;

    // Simula una inicialización asíncrona
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("ServiceClass", () => {
  test("starts uninitialized", () => {
    const service = new TestService();

    expect(service.isInitialized).toBe(false);
  });

  test("initializes only once", async () => {
    const service = new TestService();

    await service.waitUntilInitialized();
    await service.waitUntilInitialized();

    expect(service.isInitialized).toBe(true);
    expect(service.initCalls).toBe(1);
  });

  test("concurrent calls share the same initialization", async () => {
    const service = new TestService();

    await Promise.all([
      service.waitUntilInitialized(),
      service.waitUntilInitialized(),
      service.waitUntilInitialized(),
    ]);

    expect(service.initCalls).toBe(1);
    expect(service.isInitialized).toBe(true);
  });

  test("clearInit resets initialization state", async () => {
    const service = new TestService();

    await service.waitUntilInitialized();

    service.clearInit();

    expect(service.isInitialized).toBe(false);

    await service.waitUntilInitialized();

    expect(service.initCalls).toBe(2);
    expect(service.isInitialized).toBe(true);
  });

  test("_reInit forces a new initialization", async () => {
    const service = new TestService();

    await service.waitUntilInitialized();

    await service._reInit();

    expect(service.initCalls).toBe(2);
    expect(service.isInitialized).toBe(true);
  });

  test("destroy resets initialization state", async () => {
    const service = new TestService();

    await service.waitUntilInitialized();

    expect(service.isInitialized).toBe(true);

    service.destroy();

    expect(service.isInitialized).toBe(false);
  });

  test("if _init throws, initialization is still marked as completed", async () => {
    class FailingService extends ServiceClass<TestEvents> {
      async _init(): Promise<void> {
        throw new Error("Initialization failed");
      }
    }

    const service = new FailingService();

    await expect(service.waitUntilInitialized()).rejects.toThrow(
      "Initialization failed",
    );

    // El finally de #init() siempre ejecuta esto
    expect(service.isInitialized).toBe(true);
  });

  test("calling waitUntilInitialized again after a failure does not retry", async () => {
    class FailingService extends ServiceClass<TestEvents> {
      calls = 0;

      async _init(): Promise<void> {
        this.calls++;
        throw new Error("Initialization failed");
      }
    }

    const service = new FailingService();

    await expect(service.waitUntilInitialized()).rejects.toThrow();

    await service.waitUntilInitialized();

    expect(service.calls).toBe(1);
  });
});
