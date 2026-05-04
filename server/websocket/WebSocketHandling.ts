import { WebSocket } from "ws";
import type { CommonUserDataWS } from "@types";

type Timeout<T extends "timeout" | "interval"> = {
  [id: string]:
    | (T extends "timeout"
        ? { timeoutId: ReturnType<typeof setTimeout> }
        : { intervalId: ReturnType<typeof setInterval> })
    | undefined;
};

type ReturnTimeout = {
  remove: () => void;
};

class Timers {
  #timeouts: Timeout<"timeout"> = {};
  #intervals: Timeout<"interval"> = {};

  public clearInterval = (id: string) => {
    if (!this.#intervals[id]) return;

    const intervalId = this.#intervals[id]?.intervalId;
    if (intervalId) clearInterval(intervalId);
    delete this.#intervals[id];
  };

  /**
   * Sets an interval and returns an object with a remove function to clear it. If an interval with the same uniqueId already exists, it will be cleared before setting the new one.
   */

  public setInterval = (
    func: () => Promise<unknown> | unknown,
    delay: number,
    uniqueId: string,
  ): ReturnTimeout => {
    this.clearInterval(uniqueId);

    const intervalId: ReturnType<typeof setInterval> = setInterval(() => {
      func();
      this.clearInterval(uniqueId);
    }, delay);

    this.#intervals[uniqueId] = { intervalId };

    return {
      remove: () => {
        this.clearInterval(uniqueId);
      },
    };
  };

  public clearTimeout = (id: string) => {
    if (!this.#timeouts[id]) return;

    const timeoutId = this.#timeouts[id]?.timeoutId;
    if (timeoutId) clearTimeout(timeoutId);
    delete this.#timeouts[id];
  };

  /**
   * Sets a timeout and returns an object with a remove function to clear it. If a timeout with the same uniqueId already exists, it will be cleared before setting the new one.
   */
  public setTimeout = (
    func: () => Promise<unknown> | unknown,
    delay: number,
    uniqueId: string,
  ): ReturnTimeout => {
    this.clearTimeout(uniqueId);

    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      func();
      this.clearTimeout(uniqueId);
    }, delay);

    this.#timeouts[uniqueId] = { timeoutId };

    return {
      remove: () => {
        this.clearTimeout(uniqueId);
      },
    };
  };

  /**
   * Clears all active intervals and timeouts. This is useful to ensure that no timers are left running when a user disconnects or when the server is shutting down.
   */
  public clearAllTimers = () => {
    Object.keys(this.#intervals).forEach((id) => {
      if (!this.#intervals[id]?.intervalId) return;

      clearInterval(this.#intervals[id].intervalId);
      delete this.#intervals[id];
    });

    Object.keys(this.#timeouts).forEach((id) => {
      if (!this.#timeouts[id]?.timeoutId) return;

      clearTimeout(this.#timeouts[id].timeoutId);
      delete this.#timeouts[id];
    });
  };
}

class AdditionalData<T extends Record<string, unknown>> extends Timers {
  #data: T = {} as T;

  /**
   * Sets additional data for a user device. The value can be set directly or by providing a function that receives the previous value and returns the new value. This allows for easy updates based on the current state of the data.
   */
  public setAdditionalData = <
    K extends keyof T,
    Func extends (prev: T[K]) => T[K],
  >(
    key: K,
    value: T[K] | Func,
  ) => {
    this.#data[key] =
      typeof value === "function" ? (value as Func)(this.#data[key]) : value;
  };

  /**
   * Retrieves the additional data for a given key. The return type is inferred based on the key provided, ensuring type safety when accessing the data.
   */
  public getAdditionalData = <K extends keyof T>(key: K): T[K] => {
    return this.#data[key] as T[typeof key];
  };

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

  public setUserData = (data: Partial<CommonUserDataWS>) => {
    this.#userData = { ...this.#userData, ...data };

    if (data.userId && data.deviceId) this.initPing();
  };

  public pongReceived = () => {
    if (!this.#pingTimeout) return;

    this.#pingTimeout.remove();
    this.#pingTimeout = null;
  };

  #clearPing = () => {
    if (this.#pingInterval) {
      this.#pingInterval.remove();
      this.#pingInterval = null;
    }

    if (this.#pingTimeout) {
      this.#pingTimeout.remove();
      this.#pingTimeout = null;
    }
  };

  public initPing = () => {
    if (this.#pingInterval) return;

    this.#pingInterval = this.setInterval(
      () => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          this.handleClose(1000, "Ping timeout");
          return;
        }

        this.ws.send(JSON.stringify({ type: "ping" }));

        this.#pingTimeout = this.setTimeout(
          () => {
            this.handleClose(1000, "Ping response timeout");
            this.#pingTimeout?.remove();
          },
          10000,
          "ping-timeout",
        );
      },
      30000,
      "ping-interval",
    );
  };

  public handleClose = (
    reason?: number,
    message?: string,
    onClose?: () => void,
  ) => {
    if (this.#userData.isClosing) return;
    this.#userData.isClosing = true;

    const ws = this.ws;

    try {
      ws.removeAllListeners();
      if (ws.readyState !== WebSocket.OPEN) ws.close(reason, message);
    } catch {
      // Ignore
    }

    if (!this.isValidUserData()) return;

    this.#clearPing();
    this.clearAllTimers();
    if (onClose) onClose();
  };

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

  public isValidUserData = () => {
    const data = this.#userData;
    return (
      data !== null &&
      typeof data === "object" &&
      typeof data.userId === "string" &&
      typeof data.deviceId === "string"
    );
  };

  public sendMessage = (msg: Messages) => {
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.handleClose(1000, "WebSocket not open");
      return;
    }

    const stringified = JSON.stringify(msg);
    this.ws.send(stringified);
  };

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
  users: {
    [userId: string]: {
      devices: {
        [deviceId: string]: Device<MessagesDevice, AdditionalDataDevice>;
      };
      additionalData: AdditionalData;
    };
  } = {};

  /**
   * Retrieves a valid user object based on the provided userId. If the user does not exist and the create flag is set to true, a new user object will be created and returned. If create is false and the user does not exist, null will be returned.
   * @param userId - The ID of the user to retrieve.
   * @param create - A boolean flag indicating whether to create a new user if one does not exist. Defaults to false.
   * @returns The user object if found or created, or null if not found and create is false.
   */
  #getValidUser = <
    T extends NonNullable<(typeof this.users)[string]>,
    C extends boolean,
  >(
    userId: string,
    create?: C,
  ): C extends true ? T : T | null => {
    const user = this.users[userId];
    if (!user) {
      if (!create) return null as C extends true ? T : T | null;

      this.users[userId] = {
        devices: {},
      } as T;
    }

    return this.users[userId] as T;
  };

  /**
   * Adds a device to a user. If the user does not exist, it will be created. If a device with the same ID already exists for the user, it will be replaced and the previous device will be closed with a specific code and message.
   */
  public addDeviceUser = (
    device: Device<MessagesDevice, AdditionalDataDevice>,
  ) => {
    const user = this.#getValidUser(device.userId, true);

    const prevDevice = user.devices[device.deviceId];
    if (prevDevice && prevDevice !== device)
      prevDevice.handleClose(4000, "New device connected with same ID");

    user.devices[device.deviceId] = device;
  };

  /**
   * Removes a device from a user. If the device exists, it will be removed from the user's devices. If the user has no more devices after removal, the user will also be removed from the users list.
   */
  public removeUserDevice = (
    user: Device<MessagesDevice, AdditionalDataDevice>,
  ) => {
    const userId = user.userId;
    const deviceId = user.deviceId;

    if (!this.users[userId]?.devices[deviceId]) return;

    delete this.users[userId].devices[deviceId];

    if (Object.keys(this.users[userId].devices).length === 0)
      delete this.users[userId];
  };

  /**
   * Sends a message to all devices of a specific user. An optional shouldSend function can be provided to determine whether a message should be sent to a particular device based on its properties or state. If shouldSend is not provided, the message will be sent to all devices of the user.
   */
  public sendMessageToUser = (
    msg: MessagesDevice,
    userId: string,
    shouldSend?: (
      device: Device<MessagesDevice, AdditionalDataDevice>,
    ) => boolean,
  ) => {
    const user = this.#getValidUser(userId, false);
    if (!user) return;

    Object.values(user.devices).forEach((device) => {
      if (!shouldSend || shouldSend(device)) device.sendMessage(msg);
    });
  };

  /**
   * Creates a new user device. If userId and deviceId are provided, the device will be added to the corresponding user. If the user does not exist, it will be created. The function returns the created device instance.
   */
  public createUser = (ws: WebSocket, userId?: string, deviceId?: string) => {
    const user = new Device<MessagesDevice, AdditionalDataDevice>(
      ws,
      userId,
      deviceId,
    );

    if (userId && deviceId) this.addDeviceUser(user);
    return user;
  };

  /**
   * Retrieves a specific device for a user based on the provided userId and deviceId. If the user or device does not exist, null will be returned. This function allows for direct access to a user's device, which can be useful for sending targeted messages or managing specific connections.
   */
  public getUser = (userId: string, deviceId: string) => {
    const user = this.#getValidUser(userId, false);
    if (!user) return null;

    return user.devices[deviceId] || null;
  };

  /**
   * Returns the entire users object, which contains all users and their associated devices and additional data. This can be useful for debugging purposes or when you need to perform operations that involve multiple users or devices. However, it should be used with caution to avoid exposing sensitive information or overwhelming the system with too much data at once.
   */
  public getAllUsers = () => {
    return this.users;
  };

  constructor() {
    super();
  }
}
