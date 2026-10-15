import {
  it,
  jest,
  expect,
  describe,
  afterEach,
  beforeEach,
} from "@jest/globals";

let currentEffectCleanup: (() => void) | undefined = undefined;

jest.mock("react", () => ({
  useState: (init: unknown) => [init, () => {}],
  useRef: (init: unknown) => ({ current: init }),
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => (() => void) | void, deps?: unknown[]) => {
    if (deps && deps.length === 0) {
      const result = fn();
      if (typeof result === "function") {
        currentEffectCleanup = result;
      }
    }
  },
}));

jest.mock(
  "@/utils",
  () => ({
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  }),
  { virtual: true },
);

import { useLogsWebSocket } from "@frontendSrc/src/pages/Logs/hooks/useLogsWebSocket";

class MockClientWebSocket {
  static instances: MockClientWebSocket[] = [];
  url: string;
  readyState = 0;
  onopen: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: unknown) => void) | null = null;
  closeCalls = 0;

  constructor(url: string) {
    this.url = url;
    MockClientWebSocket.instances.push(this);
  }

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.({ type: "open" });
  }

  simulateClose(code = 1000, reason = "Normal Closure") {
    this.readyState = 3;
    this.onclose?.({ type: "close", code, reason });
  }

  close() {
    this.closeCalls++;
    this.readyState = 2;
    this.simulateClose(1000, "Closed by client");
  }
}

describe("useLogsWebSocket Lifecycle and Cleanup (F05)", () => {
  const originalWebSocket = globalThis.WebSocket;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    jest.useFakeTimers();
    MockClientWebSocket.instances = [];
    currentEffectCleanup = undefined;
    globalThis.WebSocket = MockClientWebSocket as unknown as typeof WebSocket;
    globalThis.window = {
      location: {
        protocol: "http:",
        hostname: "localhost",
        port: "3000",
      },
      clearTimeout: (id: number) => clearTimeout(id),
      setTimeout: (fn: () => void, ms: number) =>
        setTimeout(fn, ms) as unknown as number,
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.WebSocket = originalWebSocket;
    globalThis.window = originalWindow;
  });

  it("should terminate active socket and cancel retry timers upon unmount", () => {
    useLogsWebSocket();
    expect(MockClientWebSocket.instances.length).toBe(1);

    const initialSocket = MockClientWebSocket.instances[0];
    initialSocket.simulateOpen();

    expect(typeof currentEffectCleanup).toBe("function");
    if (typeof currentEffectCleanup === "function") {
      currentEffectCleanup();
    }

    expect(initialSocket.closeCalls).toBe(1);
    expect(initialSocket.onclose).toBeNull();

    initialSocket.simulateClose(1006, "Abnormal");

    jest.advanceTimersByTime(60000);
    expect(MockClientWebSocket.instances.length).toBe(1);
  });

  it("should cancel pending retry timer when unmounted during reconnection window", () => {
    useLogsWebSocket();
    expect(MockClientWebSocket.instances.length).toBe(1);

    const initialSocket = MockClientWebSocket.instances[0];
    initialSocket.simulateClose(1006, "Dropped");

    expect(typeof currentEffectCleanup).toBe("function");
    if (typeof currentEffectCleanup === "function") {
      currentEffectCleanup();
    }

    jest.advanceTimersByTime(60000);
    expect(MockClientWebSocket.instances.length).toBe(1);
  });
});
