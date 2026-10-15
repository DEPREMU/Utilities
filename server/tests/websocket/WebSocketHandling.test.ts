import {
  it,
  jest,
  expect,
  describe,
  afterEach,
  beforeEach,
} from "@jest/globals";
import { Users, Device } from "@/websocket/WebSocketHandling";

type MockListener = (...args: unknown[]) => void;

class MockServerWebSocket {
  static instances: MockServerWebSocket[] = [];
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = MockServerWebSocket.OPEN;
  closeCalls: { code?: number; message?: string }[] = [];
  terminateCalls = 0;
  listeners: Map<string, MockListener[]> = new Map();

  constructor() {
    MockServerWebSocket.instances.push(this);
  }

  on(event: string, listener: MockListener) {
    const list = this.listeners.get(event) || [];
    list.push(listener);
    this.listeners.set(event, list);
    return this;
  }

  removeAllListeners() {
    this.listeners.clear();
    return this;
  }

  send() {}

  close(code?: number, message?: string) {
    this.closeCalls.push({ code, message });
    this.readyState = MockServerWebSocket.CLOSED;
  }

  terminate() {
    this.terminateCalls++;
    this.readyState = MockServerWebSocket.CLOSED;
  }
}

describe("WebSocketHandling (Device and Users Lifecycle)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockServerWebSocket.instances = [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should actively close OPEN sockets and deregister user on heartbeat timeout (F04)", () => {
    const users = new Users();
    const mockWs = new MockServerWebSocket();

    const device = users.createUser(mockWs as never);
    device.setUserData({ userId: "user-1", deviceId: "device-1" });
    users.addDeviceUser(device);

    expect(users.getUser("user-1", "device-1")).toBe(device);
    expect(mockWs.closeCalls.length).toBe(0);

    jest.advanceTimersByTime(30000);
    expect(mockWs.closeCalls.length).toBe(0);

    jest.advanceTimersByTime(10000);

    expect(mockWs.closeCalls.length).toBe(1);
    expect(mockWs.closeCalls[0].code).toBe(1000);
    expect(mockWs.closeCalls[0].message).toBe("Ping response timeout");

    expect(users.getUser("user-1", "device-1")).toBeNull();
    expect(users.users.get("user-1")).toBeUndefined();
  });

  it("should terminate previous device OPEN socket and update mapping on duplicate connection", () => {
    const users = new Users();
    const mockWs1 = new MockServerWebSocket();
    const mockWs2 = new MockServerWebSocket();

    const device1 = users.createUser(mockWs1 as never);
    device1.setUserData({ userId: "user-1", deviceId: "device-1" });
    users.addDeviceUser(device1);

    expect(users.getUser("user-1", "device-1")).toBe(device1);

    const device2 = users.createUser(mockWs2 as never);
    device2.setUserData({ userId: "user-1", deviceId: "device-1" });
    users.addDeviceUser(device2);

    expect(mockWs1.closeCalls.length).toBe(1);
    expect(mockWs1.closeCalls[0].code).toBe(4000);
    expect(mockWs1.closeCalls[0].message).toBe(
      "New device connected with same ID",
    );

    expect(users.getUser("user-1", "device-1")).toBe(device2);
    expect(users.users.get("user-1")?.devices.size).toBe(1);
    expect(mockWs2.closeCalls.length).toBe(0);
  });

  it("should perform idempotent teardown and clear all timers even with empty user data", () => {
    const mockWs = new MockServerWebSocket();
    const device = new Device(mockWs as never);

    let timeoutFired = false;
    device.setTimeout(
      () => {
        timeoutFired = true;
      },
      5000,
      "test-timer",
    );

    device.handleClose(1000, "Normal");
    device.handleClose(1000, "Normal");

    expect(mockWs.closeCalls.length).toBe(1);

    jest.advanceTimersByTime(10000);
    expect(timeoutFired).toBe(false);
  });
});
