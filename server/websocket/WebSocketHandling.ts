import { WebSocket } from "ws";
import { getValueState } from "@common";
import type { CommonUserDataWS } from "@types";

const TIMEOUT_PING = 10000; // 10 seconds
const INTERVAL_PING = 30000; // 30 seconds

type Timeout<T extends "timeout" | "interval"> = Map<
  string,
  T extends "timeout"
    ? { timeoutId: ReturnType<typeof setTimeout> }
    : { intervalId: ReturnType<typeof setInterval> }
>;

type ReturnTimeout = {
  remove: () => void;
};

class Timers {
  #timeouts: Timeout<"timeout"> = new Map();
  #intervals: Timeout<"interval"> = new Map();

  public clearInterval(id: string) {
    if (!this.#intervals.has(id)) return;

    const intervalId = this.#intervals.get(id)?.intervalId;
    if (intervalId) clearInterval(intervalId);
    this.#intervals.delete(id);
  }

  /**
   * Sets an interval and returns an object with a remove function to clear it. If an interval with the same uniqueId already exists, it will be cleared before setting the new one.
   */

  public setInterval(
    func: () => Promise<unknown> | unknown,
    delay: number,
    uniqueId: string,
  ): ReturnTimeout {
    this.clearInterval(uniqueId);

    const intervalId: ReturnType<typeof setInterval> = setInterval(() => {
      func();
      this.clearInterval(uniqueId);
    }, delay);

    this.#intervals.set(uniqueId, { intervalId });

    return {
      remove: () => {
        this.clearInterval(uniqueId);
      },
    };
  }

  public clearTimeout(id: string) {
    if (!this.#timeouts.has(id)) return;

    const timeoutId = this.#timeouts.get(id)?.timeoutId;
    if (timeoutId) clearTimeout(timeoutId);
    this.#timeouts.delete(id);
  }

  /**
   * Sets a timeout and returns an object with a remove function to clear it. If a timeout with the same uniqueId already exists, it will be cleared before setting the new one.
   */
  public setTimeout(
    func: () => Promise<unknown> | unknown,
    delay: number,
    uniqueId: string,
  ): ReturnTimeout {
    this.clearTimeout(uniqueId);

    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      func();
      this.clearTimeout(uniqueId);
    }, delay);

    this.#timeouts.set(uniqueId, { timeoutId });

    return {
      remove: () => {
        this.clearTimeout(uniqueId);
      },
    };
  }

  /**
   * Clears all active intervals and timeouts. This is useful to ensure that no timers are left running when a user disconnects or when the server is shutting down.
   */
  public clearAllTimers() {
    this.#intervals.forEach((value, key) => {
      if (value.intervalId) clearInterval(value.intervalId);

      this.#intervals.delete(key);
    });

    this.#timeouts.forEach((value, key) => {
      if (value.timeoutId) clearTimeout(value.timeoutId);

      this.#timeouts.delete(key);
    });
  }
}

class AdditionalData<T extends Record<string, unknown>> extends Timers {
  #data: T = {} as T;

  /**
   * Sets additional data for a user device. The value can be set directly or by providing a function that receives the previous value and returns the new value. This allows for easy updates based on the current state of the data.
   */
  public setAdditionalData<
    K extends keyof T,
    Func extends (prev: T[K]) => T[K],
  >(key: K, value: T[K] | Func) {
    this.#data[key] = getValueState(value, () => this.#data[key]);
  }

  /**
   * Retrieves the additional data for a given key. The return type is inferred based on the key provided, ensuring type safety when accessing the data.
   */
  public getAdditionalData<K extends keyof T>(key: K): T[K] {
    return this.#data[key] as T[typeof key];
  }

  protected getAllAdditionalData(): T {
    return this.#data;
  }

  constructor() {
    super();
  }
}

class Device<
  Messages extends Record<string, unknown>,
  AdditionalData extends Record<string, unknown>,
> extends AdditionalData<AdditionalData> {
  ws: WebSocket;

  #pingTimeout: ReturnType<typeof this.setTimeout> | null = null;
  #pingInterval: ReturnType<typeof this.setInterval> | null = null;

  #userData: CommonUserDataWS = {
    userId: "",
    deviceId: "",
    isClosing: false,
  };

  public setUserData(data: Partial<CommonUserDataWS>) {
    this.#userData = { ...this.#userData, ...data };

    if (data.userId && data.deviceId) this.initPing();
  }

  public pongReceived() {
    if (!this.#pingTimeout) return;

    this.#pingTimeout.remove();
    this.#pingTimeout = null;
  }

  #clearPing() {
    if (this.#pingInterval) {
      this.#pingInterval.remove();
      this.#pingInterval = null;
    }

    if (this.#pingTimeout) {
      this.#pingTimeout.remove();
      this.#pingTimeout = null;
    }
  }

  public initPing() {
    if (this.#pingInterval) return;

    this.#pingInterval = this.setInterval(
      () => {
        this.sendMessage({ type: "ping" } as never);

        this.#pingTimeout = this.setTimeout(
          () => this.handleClose(1000, "Ping response timeout"),
          TIMEOUT_PING,
          "ping-timeout",
        );
      },
      INTERVAL_PING,
      "ping-interval",
    );
  }

  public handleClose(reason?: number, message?: string, onClose?: () => void) {
    if (this.#userData.isClosing) return;
    this.#userData.isClosing = true;

    const ws = this.ws;

    try {
      ws.removeAllListeners();
      if (ws.readyState !== WebSocket.OPEN) ws.close(reason, message);
    } catch {
      // Ignore
    }

    if (!this.isValidUserData(this.#userData)) return;

    this.#clearPing();
    this.clearAllTimers();
    if (onClose) onClose();
  }

  public get userId() {
    return this.#userData.userId;
  }

  public get deviceId() {
    return this.#userData.deviceId;
  }

  public set userId(userId: string) {
    this.#userData.userId = userId;
  }

  public set deviceId(deviceId: string) {
    this.#userData.deviceId = deviceId;
  }

  public isValidUserData(data: Partial<CommonUserDataWS>) {
    return (
      data !== null &&
      typeof data === "object" &&
      typeof data.userId === "string" &&
      typeof data.deviceId === "string"
    );
  }

  public sendMessage(msg: Messages) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.handleClose(1000, "WebSocket not open");
      return;
    }

    try {
      this.ws.send(JSON.stringify(msg));
    } catch {
      // Ignore
    }
  }

  constructor(ws: WebSocket, userId?: string, deviceId?: string) {
    super();

    this.ws = ws;
    this.#userData.userId = userId || "";
    this.#userData.deviceId = deviceId || "";
  }
}

export class Users<
  AdditionalData extends Record<string, unknown>,
  MessagesDevice extends Record<string, unknown>,
  AdditionalDataDevice extends Record<string, unknown> = Record<
    string,
    unknown
  >,
> extends AdditionalData<AdditionalData> {
  users: Map<
    string,
    {
      devices: Map<string, Device<MessagesDevice, AdditionalDataDevice>>;
      additionalData: AdditionalData;
    }
  > = new Map();

  /**
   * Retrieves a valid user object based on the provided userId. If the user does not exist and the create flag is set to true, a new user object will be created and returned. If create is false and the user does not exist, null will be returned.
   * @param userId - The ID of the user to retrieve.
   * @param create - A boolean flag indicating whether to create a new user if one does not exist. Defaults to false.
   * @returns The user object if found or created, or null if not found and create is false.
   */
  #getValidUser<
    T extends NonNullable<ReturnType<typeof this.users.get>>,
    C extends boolean,
  >(userId: string, create?: C): C extends true ? T : T | null {
    const user = this.users.get(userId);
    if (!user) {
      if (!create) return null as C extends true ? T : T | null;

      this.users.set(userId, {
        devices: new Map() as T["devices"],
        additionalData: {} as AdditionalData,
      } as T);
    }

    return this.users.get(userId) as T;
  }

  /**
   * Adds a device to a user. If the user does not exist, it will be created. If a device with the same ID already exists for the user, it will be replaced and the previous device will be closed with a specific code and message.
   */
  public addDeviceUser(device: Device<MessagesDevice, AdditionalDataDevice>) {
    const user = this.#getValidUser(device.userId, true);

    const prevDevice = user.devices.get(device.deviceId);
    if (prevDevice && prevDevice !== device)
      prevDevice.handleClose(4000, "New device connected with same ID");

    user.devices.set(device.deviceId, device);
  }

  /**
   * Removes a device from a user. If the device exists, it will be removed from the user's devices. If the user has no more devices after removal, the user will also be removed from the users list.
   */
  public removeUserDevice(user: Device<MessagesDevice, AdditionalDataDevice>) {
    const userId = user.userId;
    const deviceId = user.deviceId;

    if (!this.users.get(userId)?.devices.get(deviceId)) return;

    this.users.get(userId)?.devices.delete(deviceId);

    if (this.users.get(userId)?.devices?.size === 0) this.users.delete(userId);
  }

  /**
   * Sends a message to all devices of a specific user. An optional shouldSend function can be provided to determine whether a message should be sent to a particular device based on its properties or state. If shouldSend is not provided, the message will be sent to all devices of the user.
   */
  public sendMessageToUser(
    msg: MessagesDevice,
    userId: string,
    shouldSend?: (
      device: Device<MessagesDevice, AdditionalDataDevice>,
    ) => boolean,
  ) {
    const user = this.#getValidUser(userId, false);
    if (!user) return;

    user.devices.forEach((device) => {
      if (!shouldSend || shouldSend(device)) device.sendMessage(msg);
    });
  }

  /**
   * Creates a new user device. If userId and deviceId are provided, the device will be added to the corresponding user. If the user does not exist, it will be created. The function returns the created device instance.
   */
  public createUser(ws: WebSocket, userId?: string, deviceId?: string) {
    const user = new Device<MessagesDevice, AdditionalDataDevice>(
      ws,
      userId,
      deviceId,
    );

    if (userId && deviceId) this.addDeviceUser(user);
    return user;
  }

  /**
   * Retrieves a specific device for a user based on the provided userId and deviceId. If the user or device does not exist, null will be returned. This function allows for direct access to a user's device, which can be useful for sending targeted messages or managing specific connections.
   */
  public getUser(userId: string, deviceId: string) {
    const user = this.#getValidUser(userId, false);
    if (!user) return null;

    return user.devices.get(deviceId) || null;
  }

  /**
   * Returns the entire users object, which contains all users and their associated devices and additional data. This can be useful for debugging purposes or when you need to perform operations that involve multiple users or devices. However, it should be used with caution to avoid exposing sensitive information or overwhelming the system with too much data at once.
   */
  public getAllUsers() {
    return this.users;
  }

  constructor() {
    super();
  }
}
