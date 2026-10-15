import {
  it,
  jest,
  expect,
  describe,
  afterEach,
  beforeEach,
} from "@jest/globals";

jest.mock("@appSrc/src/utils/TOP_LEVEL", () => ({
  Logger: class {
    log() {}
    warn() {}
    error() {}
  },
}));

import { ReconnectingWebSocket } from "@appSrc/src/utils/reconnecting-websocket";

type MockEventHandler = (event: unknown) => void;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  url: string;
  protocols?: string | string[];
  readyState = MockWebSocket.CONNECTING;
  onopen: MockEventHandler | null = null;
  onclose: MockEventHandler | null = null;
  onerror: MockEventHandler | null = null;
  onmessage: MockEventHandler | null = null;
  sentMessages: string[] = [];

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    MockWebSocket.instances.push(this);
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({ type: "open" });
  }

  simulateClose(code = 1000, reason = "Normal Closure") {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ type: "close", code, reason });
  }

  simulateError(error: unknown = new Error("Connection failed")) {
    this.onerror?.({ type: "error", error });
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSING;
    this.simulateClose(1000, "Closed by client");
  }
}

describe("ReconnectingWebSocket", () => {
  const originalWebSocket = globalThis.WebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    MockWebSocket.instances = [];
    globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.WebSocket = originalWebSocket;
  });

  it("should establish connection and reset retries on open", async () => {
    const ws = new ReconnectingWebSocket("ws://test.local", {
      startClosed: true,
    });

    const connectPromise = ws.reconnect();
    expect(MockWebSocket.instances.length).toBe(1);

    const mock = MockWebSocket.instances[0];
    mock.simulateOpen();
    await connectPromise;

    expect(ws.isConnected).toBe(true);
    expect(ws.isConnecting).toBe(false);
  });

  it("should dispatch onClose and automatically schedule reconnect on unexpected drop (F01)", async () => {
    const onCloseMock = jest.fn();
    const ws = new ReconnectingWebSocket("ws://test.local", {
      startClosed: true,
      retryDelay: 1000,
      backoffJitter: 0,
    });
    ws.onClose = onCloseMock;

    const connectPromise = ws.reconnect();
    const mock1 = MockWebSocket.instances[0];
    mock1.simulateOpen();
    await connectPromise;

    expect(ws.isConnected).toBe(true);

    mock1.simulateClose(1006, "Abnormal Closure");

    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(ws.isConnected).toBe(false);

    expect(MockWebSocket.instances.length).toBe(1);

    jest.advanceTimersByTime(1000);
    expect(MockWebSocket.instances.length).toBe(2);

    const mock2 = MockWebSocket.instances[1];
    mock2.simulateOpen();

    expect(ws.isConnected).toBe(true);
  });

  it("should settle attempt promise on handshake error and permit clean subsequent reconnect (F02)", async () => {
    const ws = new ReconnectingWebSocket("ws://test.local", {
      startClosed: true,
      retryDelay: 1000,
      backoffJitter: 0,
    });

    const failedAttempt = ws.reconnect();
    expect(MockWebSocket.instances.length).toBe(1);

    const mock1 = MockWebSocket.instances[0];
    mock1.simulateError(new Error("Handshake failed"));
    mock1.simulateClose(1006, "Abnormal Closure");

    await failedAttempt;
    expect(ws.isConnecting).toBe(false);
    expect(ws.isConnected).toBe(false);

    ws.close();
    expect(ws.shouldReconnect).toBe(false);

    const freshAttempt = ws.reconnect();
    expect(MockWebSocket.instances.length).toBe(2);

    const mock2 = MockWebSocket.instances[1];
    mock2.simulateOpen();
    await freshAttempt;

    expect(ws.isConnected).toBe(true);
  });

  it("should settle promise and reset flags when cancelled via close() during connect (F02)", async () => {
    const ws = new ReconnectingWebSocket("ws://test.local", {
      startClosed: true,
    });

    const inFlightPromise = ws.reconnect();
    expect(ws.isConnecting).toBe(true);

    ws.close();

    await inFlightPromise;
    expect(ws.isConnecting).toBe(false);
    expect(ws.isConnected).toBe(false);
    expect(ws.shouldReconnect).toBe(false);

    const newAttempt = ws.reconnect();
    expect(MockWebSocket.instances.length).toBe(2);
    const mock2 = MockWebSocket.instances[1];
    mock2.simulateOpen();
    await newAttempt;

    expect(ws.isConnected).toBe(true);
  });

  it("should ignore stale socket events from previous attempts", async () => {
    const ws = new ReconnectingWebSocket("ws://test.local", {
      startClosed: true,
    });

    void ws.reconnect();
    const staleMock = MockWebSocket.instances[0];

    ws.close();
    void ws.reconnect();
    const activeMock = MockWebSocket.instances[1];

    staleMock.simulateOpen();
    expect(ws.isConnected).toBe(false);

    activeMock.simulateOpen();
    expect(ws.isConnected).toBe(true);
  });
});
