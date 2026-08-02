import type WebSocketType from "ws";
import { Timers, REPLACERS } from "@common";

type FunctionOnOpenMessage<T = string> = (
  instance: ReconnectingWebSocket<T>,
) => Promise<T | null> | T | null;

export type OptionsReconnectingWS<T = string> = {
  /**
   * The maximum number of reconnection attempts before giving up, negatives mean infinite.
   * @default -1 // meaning it will keep trying indefinitely.
   */
  maxRetries?: number;
  /**
   * The delay in milliseconds between reconnection attempts.
   * @default 1000 // (1 second).
   */
  retryDelay?: number;
  /**
   * Whether to start the WebSocket connection in a closed state. If `true`, the connection will not be established until the `reconnect()` method is called.
   * @default false
   */
  startClosed?: boolean;
  /**
   * A value or a function that returns a T value (or a Promise that resolves to a T value) to be converted in string and be sent immediately after the WebSocket connection is opened. This can be used for authentication or initialization purposes, every time the connection is established, this value will be sent. If a function is provided, and the function returns a falsy value or null, no message will be sent.
   * @default undefined // meaning no message will be sent after opening the connection.
   */
  messagesAfterOpen?: (T | FunctionOnOpenMessage<T>)[];
  /**
   * Optional subprotocols parameter to specify the WebSocket subprotocols. This can be a single string or an array of strings, depending on the server's requirements.
   * @default undefined // meaning no subprotocols will be specified.
   */
  protocols?: string | string[];
  /**
   * Whether the WebSocket should automatically attempt to reconnect when a connection error occurs. If `true`, the WebSocket will try to reconnect according to the specified `maxRetries` and `retryDelay` options. If `false`, the WebSocket will not attempt to reconnect and will require manual intervention to establish a new connection.
   * @default true
   */
  reconnectOnError?: boolean;
  /**
   * Whether the WebSocket should automatically attempt to reconnect when the connection is closed. If `true`, the WebSocket will try to reconnect according to the specified `maxRetries` and `retryDelay` options whenever the connection is closed, regardless of the reason for closure. If `false`, the WebSocket will not attempt to reconnect when the connection is closed and will require manual intervention to establish a new connection.
   * @default true
   */
  reconnectOnClose?: boolean;
  /**
   * Whether to enable automatic ping-pong messages to keep the WebSocket connection alive and detect disconnections. If timeout and interval, the WebSocket will send a ping message after the specified interval and wait for a pong response within the specified timeout. If the expected message is not received within the timeout period, the WebSocket will be considered disconnected and will trigger the reconnection logic if enabled. If only expectedMessage and expectedResponse are provided, the WebSocket will listen for incoming messages and automatically respond with the expectedResponse whenever a message matching the expectedMessage is received. This can be used to implement a custom keep-alive mechanism or to respond to specific server messages without having to set up manual event listeners.
   * @default undefined // meaning no automatic ping-pong mechanism will be enabled.
   */
  pingPong?:
    | {
        timeout: number;
        interval: number;
        messageToSend: string;
        expectedMessage: string;
      }
    | {
        expectedMessage: string;
        expectedResponse: string;
      };
  /**
   * Whether to queue messages sent while the WebSocket is not open and automatically send them once the connection is established. If `true`, any messages sent using the `send()` method while the WebSocket is not in the OPEN state will be stored in a queue and sent in order once the connection is successfully established. If `false`, messages sent while the WebSocket is not open will be discarded, and a warning will be logged to indicate that the message could not be sent due to the WebSocket's state.
   * @default true
   */
  queueMessages?: boolean;
};

export type ReasonCloseWS = "timeout" | "error" | "reconnect" | "manual";

const DEFAULT_OPTIONS: OptionsReconnectingWS = {
  maxRetries: -1,
  retryDelay: 1000,
  startClosed: false,
  queueMessages: true,
  reconnectOnError: true,
  reconnectOnClose: true,
};

const TAG = "ReconnectingWebSocket";

export class ReconnectingWebSocket<T = string> {
  #url: string;
  #options: OptionsReconnectingWS<T> = {
    ...(DEFAULT_OPTIONS as unknown as OptionsReconnectingWS<T>),
  };
  #ws: WebSocket | null = null;
  #retries = 0;
  #connected = false;
  #connecting = false;
  #shouldReconnect = true;
  #pongSettings = {
    timeoutId: null as number | null,
    intervalId: null as number | null,
  };
  #messagesQueue: string[] = [];

  #onOpen: WebSocketType["onopen"] | null = null;
  #onClose: WebSocketType["onclose"] | null = null;
  #onError: WebSocketType["onerror"] | null = null;
  #onMessage: WebSocketType["onmessage"] | null = null;

  #unQueueMessages = () => {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) return;

    while (this.#messagesQueue.length > 0) {
      const message = this.#messagesQueue.shift();
      if (message) this.#ws.send(message);
    }
  };

  public set url(newURL: string) {
    if (this.#url === newURL) return;
    this.#url = newURL;
    if (this.#ws) {
      this.#closeWs("manual");
      if (this.#shouldReconnect) this.reconnect();
    }
  }

  public set onOpen(callback: WebSocketType["onopen"] | null) {
    this.#onOpen = callback;
  }

  public set onClose(callback: WebSocketType["onclose"] | null) {
    this.#onClose = callback;
  }

  public set onError(callback: WebSocketType["onerror"] | null) {
    this.#onError = callback;
  }

  public set onMessage(callback: WebSocketType["onmessage"] | null) {
    this.#onMessage = callback;
  }

  public get isConnecting() {
    return this.#connecting && this.#ws?.readyState === WebSocket.CONNECTING;
  }

  public get isConnected() {
    return this.#connected && this.#ws?.readyState === WebSocket.OPEN;
  }

  public send = (data: T, doNotQueue?: boolean) => {
    const msg = typeof data === "string" ? data : JSON.stringify(data);

    if (this.#ws?.readyState === WebSocket.OPEN) return this.#ws.send(msg);

    if (this.#options.queueMessages && !doNotQueue) {
      this.#messagesQueue.push(msg);
    } else {
      REPLACERS.Logger.warn(
        TAG,
        "Cannot send message: WebSocket is not open. Message discarded:",
        msg.slice(0, 50) + (msg.length > 50 ? "..." : ""),
      );
    }
  };

  #reconnectingPromise: Promise<void> | null = null;

  #handlePingPong = () => {
    if (!this.#options.pingPong || this.#pongSettings.intervalId) return;

    if ("timeout" in this.#options.pingPong) {
      const { interval, timeout } = this.#options.pingPong;
      this.#pongSettings.intervalId = Timers.setInterval(() => {
        if (!this.#ws) return;
        if (!this.#options.pingPong) return;

        if ("messageToSend" in this.#options.pingPong) {
          this.#ws.send(this.#options.pingPong.messageToSend);
        }

        this.#pongSettings.timeoutId = Timers.setTimeout(() => {
          REPLACERS.Logger.warn(
            TAG,
            "Ping timeout: No pong response received within expected time.",
          );
          this.#closeWs("timeout");
          this.reconnect();
        }, timeout);
      }, interval);
    }
  };

  #_reconnect = async () => {
    try {
      if (!this.#shouldReconnect) return;
      if (this.#reconnectingPromise) return this.#reconnectingPromise;
      if (this.#connecting) return;
      this.#connecting = true;

      while (
        !this.#connected &&
        this.#shouldReconnect &&
        (!this.#options.maxRetries ||
          this.#options.maxRetries < 0 ||
          this.#retries < this.#options.maxRetries)
      ) {
        await new Promise<void>((resolve) => {
          let resolved = false;
          let handleResolve = (success: boolean) => {
            if (resolved) return;
            resolved = true;

            this.#connected = success;
            this.#connecting = false;
            if (success) this.#reconnectingPromise = null;

            resolve();
            handleResolve = () => {};
          };

          if (
            this.#options.maxRetries &&
            this.#options.maxRetries >= 0 &&
            this.#retries >= this.#options.maxRetries
          ) {
            REPLACERS.Logger.warn(
              TAG,
              "Maximum reconnection attempts reached. Stopping further attempts.",
            );
            this.#shouldReconnect = false;
            handleResolve(false);
            return;
          }

          this.#ws = new WebSocket(
            this.#url,
            this.#options.protocols || undefined,
          );

          this.#ws.onopen = async (event) => {
            if (!this.#ws) return;

            REPLACERS.Logger.log(
              TAG,
              "WebSocket connection established:",
              this.#url,
            );

            this.#retries = 0;
            for (
              let i = 0;
              i < (this.#options.messagesAfterOpen?.length || 0);
              i++
            ) {
              const messageOrFunc = this.#options.messagesAfterOpen?.[i];
              const message =
                typeof messageOrFunc !== "function"
                  ? messageOrFunc
                  : await (messageOrFunc as FunctionOnOpenMessage<T>)?.(this);

              if (!message) continue;
              this.#ws.send(
                typeof message === "string" ? message : JSON.stringify(message),
              );
            }

            if (this.#onOpen) this.#onOpen.call(this.#ws, event as never);
            this.#handlePingPong();
            this.#unQueueMessages();
            handleResolve(true);
          };

          this.#ws.onclose = (event) => {
            if (!this.#ws) return;

            REPLACERS.Logger.warn(
              TAG,
              "WebSocket connection closed:",
              this.#url,
              "Code:",
              event.code ?? "No code provided",
              "Reason:",
              event.reason ?? "No reason provided",
            );

            if (this.#options.reconnectOnClose) {
              this.#closeWs("reconnect");
              this.#retries++;
              this.#connected = false;
              this.#connecting = false;
            } else {
              this.#shouldReconnect = false;
              this.#onClose?.call(this.#ws, event as never);
              this.#closeWs();
            }
            handleResolve(false);
          };

          this.#ws.onerror = (event) => {
            if (!this.#ws) return;

            REPLACERS.Logger.error(
              TAG,
              "WebSocket error occurred:",
              this.#url,
              "Event:",
              event,
            );

            if (this.#options.reconnectOnError) {
              this.#closeWs("error");
            } else {
              this.#shouldReconnect = false;
              this.#onError?.call(this.#ws, event as never);
              this.#closeWs();
            }
          };

          this.#ws.onmessage = (event) => {
            if (!this.#ws) return;

            if (this.#options.pingPong) {
              const expectedMessage = this.#options.pingPong.expectedMessage;

              if (expectedMessage && event.data === expectedMessage) {
                if (this.#pongSettings.timeoutId) {
                  Timers.clearTimeout(this.#pongSettings.timeoutId);
                  this.#pongSettings.timeoutId = null;
                }
                if ("expectedResponse" in this.#options.pingPong && this.#ws) {
                  this.#ws.send(this.#options.pingPong.expectedResponse);
                }
                return;
              }
            }

            if (this.#onMessage) this.#onMessage.call(this.#ws, event as never);
          };
        });
        if (!this.#connected)
          await Timers.sleep(
            this.#options.retryDelay || (DEFAULT_OPTIONS.retryDelay as number),
          );
      }
    } catch (error) {
      REPLACERS.Logger.error(
        TAG,
        "Error during WebSocket reconnection:",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      this.#reconnectingPromise = null;
    }
  };

  #closeWs = (reason?: ReasonCloseWS, alreadyClosed?: boolean) => {
    if (!this.#ws) return;

    const ws = this.#ws;
    this.#ws = null;
    this.#connected = false;

    REPLACERS.Logger.log(
      TAG,
      "Closing WebSocket connection:",
      this.#url,
      "Reason:",
      reason || "No specified",
    );

    if (this.#pongSettings.intervalId) {
      Timers.clearInterval(this.#pongSettings.intervalId);
      this.#pongSettings.intervalId = null;
    }
    if (this.#pongSettings.timeoutId) {
      Timers.clearTimeout(this.#pongSettings.timeoutId);
      this.#pongSettings.timeoutId = null;
    }

    if (alreadyClosed) return;

    ws.close();
  };

  /**
   * Manually initiates a reconnection attempt to establish a new WebSocket connection. If the WebSocket is already connected or in the process of connecting, this method will have no effect. If the WebSocket is currently disconnected and not attempting to reconnect, calling this method will start the reconnection process according to the specified options (such as `maxRetries` and `retryDelay`). The method returns a Promise that resolves once the reconnection attempt has completed, whether it was successful or not.
   */
  public reconnect = async (): Promise<void> => {
    this.#shouldReconnect = true;

    if (this.#reconnectingPromise) return this.#reconnectingPromise;

    this.#reconnectingPromise = this.#_reconnect();
    return this.#reconnectingPromise;
  };

  /**
   * Manually closes the WebSocket connection and prevents any further automatic reconnection attempts. After calling this method, the WebSocket will remain closed until the `reconnect()` method is called again to establish a new connection.
   */
  public close = () => {
    this.#shouldReconnect = false;
    this.#closeWs("manual");
  };

  /**
   * Sets whether the WebSocket should automatically attempt to reconnect when the connection is closed or an error occurs. If set to `true`, the WebSocket will try to reconnect according to the specified `maxRetries` and `retryDelay` options whenever the connection is closed or an error occurs, regardless of the reason for closure or error. If set to `false`, the WebSocket will not attempt to reconnect when the connection is closed or an error occurs and will require manual intervention (by calling the `reconnect()` method) to establish a new connection.
   */
  public set shouldReconnect(value: boolean) {
    this.#shouldReconnect = value;
    if (!value) {
      this.#closeWs("manual");
    } else {
      this.reconnect();
    }
  }

  public get shouldReconnect() {
    return this.#shouldReconnect;
  }

  constructor(url: string, options?: OptionsReconnectingWS<T>) {
    this.#url = url;
    this.#options = { ...this.#options, ...options };

    if (this.#options.startClosed) return;
    this.reconnect();
  }
}
