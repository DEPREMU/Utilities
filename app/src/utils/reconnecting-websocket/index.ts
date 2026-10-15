import { Logger } from "../TOP_LEVEL";
import type WebSocketType from "ws";
import { calculateExponentialBackoff, Timers } from "@common";

const logger = new Logger("reconnecting-websocket");

type FunctionOnOpenMessage<T = string> = (
  instance: ReconnectingWebSocket<T>,
) => Promise<T | null> | T | null;

export type OptionsReconnectingWS<T = string> = {
  /**
   * The maximum number of reconnection attempts before giving up, negatives mean infinite.
   * @default -1
   */
  maxRetries?: number;
  /**
   * The initial delay in milliseconds between reconnection attempts.
   * @default 1000
   */
  retryDelay?: number;
  /**
   * The maximum delay ceiling in milliseconds for exponential backoff.
   * @default 30000
   */
  maxRetryDelay?: number;
  /**
   * The exponential backoff multiplication factor.
   * @default 1.5
   */
  backoffMultiplier?: number;
  /**
   * The proportional jitter ratio applied to backoff delays.
   * @default 0.1
   */
  backoffJitter?: number;
  /**
   * Whether to start the WebSocket connection in a closed state.
   * @default false
   */
  startClosed?: boolean;
  /**
   * Messages or functions yielding messages to send immediately after open.
   * @default undefined
   */
  messagesAfterOpen?: (T | FunctionOnOpenMessage<T>)[];
  /**
   * Optional subprotocols parameter.
   * @default undefined
   */
  protocols?: string | string[];
  /**
   * Whether the WebSocket should automatically attempt to reconnect when a connection error occurs.
   * @default true
   */
  reconnectOnError?: boolean;
  /**
   * Whether the WebSocket should automatically attempt to reconnect when the connection is closed.
   * @default true
   */
  reconnectOnClose?: boolean;
  /**
   * Ping-pong keepalive configuration.
   * @default undefined
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
   * Whether to queue messages sent while not connected.
   * @default true
   */
  queueMessages?: boolean;
};

export type ReasonCloseWS = "timeout" | "error" | "reconnect" | "manual";

const DEFAULT_OPTIONS: OptionsReconnectingWS = {
  maxRetries: -1,
  retryDelay: 1000,
  maxRetryDelay: 30000,
  backoffMultiplier: 1.5,
  backoffJitter: 0.1,
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
  #attemptId = 0;
  #reconnectingPromise: Promise<void> | null = null;
  #inFlightResolver: (() => void) | null = null;
  #retryTimeoutId: number | null = null;
  #pongSettings = {
    timeoutId: null as number | null,
    intervalId: null as number | null,
  };
  #messagesQueue: string[] = [];

  #onOpen: WebSocketType["onopen"] | null = null;
  #onClose: WebSocketType["onclose"] | null = null;
  #onError: WebSocketType["onerror"] | null = null;
  #onMessage: WebSocketType["onmessage"] | null = null;

  /**
   * Clears any active reconnection timer.
   */
  #clearRetryTimer = () => {
    if (this.#retryTimeoutId !== null) {
      Timers.clearTimeout(this.#retryTimeoutId);
      this.#retryTimeoutId = null;
    }
  };

  /**
   * Clears active keepalive interval and timeout handles.
   */
  #clearPingPong = () => {
    if (this.#pongSettings.intervalId !== null) {
      Timers.clearInterval(this.#pongSettings.intervalId);
      this.#pongSettings.intervalId = null;
    }
    if (this.#pongSettings.timeoutId !== null) {
      Timers.clearTimeout(this.#pongSettings.timeoutId);
      this.#pongSettings.timeoutId = null;
    }
  };

  /**
   * Settles the pending in-flight connection promise.
   */
  #settleInFlight = () => {
    if (this.#inFlightResolver) {
      const resolver = this.#inFlightResolver;
      this.#inFlightResolver = null;
      resolver();
    }
  };

  /**
   * Flushes queued messages through the open transport.
   */
  #unQueueMessages = () => {
    if (!this.#ws || this.#ws.readyState !== WebSocket.OPEN) return;

    while (this.#messagesQueue.length > 0) {
      const message = this.#messagesQueue.shift();
      if (message) this.#ws.send(message);
    }
  };

  /**
   * Sets the target endpoint URL and reconnects if active.
   */
  public set url(newURL: string) {
    if (this.#url === newURL) return;
    this.#url = newURL;
    if (this.#ws) {
      this.#closeWs("manual");
      if (this.#shouldReconnect) void this.reconnect();
    }
  }

  /**
   * Retrieves the target endpoint URL.
   */
  public get url() {
    return this.#url;
  }

  /**
   * Sets the onOpen event callback.
   */
  public set onOpen(callback: WebSocketType["onopen"] | null) {
    this.#onOpen = callback;
  }

  /**
   * Sets the onClose event callback.
   */
  public set onClose(callback: WebSocketType["onclose"] | null) {
    this.#onClose = callback;
  }

  /**
   * Sets the onError event callback.
   */
  public set onError(callback: WebSocketType["onerror"] | null) {
    this.#onError = callback;
  }

  /**
   * Sets the onMessage event callback.
   */
  public set onMessage(callback: WebSocketType["onmessage"] | null) {
    this.#onMessage = callback;
  }

  /**
   * Returns whether a connection handshake is currently in progress.
   */
  public get isConnecting() {
    return this.#connecting && this.#ws?.readyState === WebSocket.CONNECTING;
  }

  /**
   * Returns whether the connection is currently open and active.
   */
  public get isConnected() {
    return this.#connected && this.#ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Sends a message through the connection or queues it if offline.
   */
  public send = (data: T, doNotQueue?: boolean) => {
    const msg = typeof data === "string" ? data : JSON.stringify(data);

    if (this.#ws?.readyState === WebSocket.OPEN) return this.#ws.send(msg);

    if (this.#options.queueMessages && !doNotQueue) {
      this.#messagesQueue.push(msg);
    } else {
      logger.warn(
        "Cannot send message: WebSocket is not open. Message discarded:",
        msg.slice(0, 50) + (msg.length > 50 ? "..." : ""),
      );
    }
  };

  /**
   * Sets up periodic ping-pong keepalive messages.
   */
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
          logger.warn(
            "Ping timeout: No pong response received within expected time.",
          );
          this.#closeWs("timeout");
          void this.reconnect();
        }, timeout);
      }, interval);
    }
  };

  /**
   * Schedules a delayed reconnection using exponential backoff.
   */
  #scheduleReconnect = () => {
    if (!this.#shouldReconnect) return;

    if (
      this.#options.maxRetries !== undefined &&
      this.#options.maxRetries >= 0 &&
      this.#retries >= this.#options.maxRetries
    ) {
      logger.warn(
        "Maximum reconnection attempts reached. Stopping further attempts.",
      );
      this.#shouldReconnect = false;
      return;
    }

    this.#clearRetryTimer();

    const delay = calculateExponentialBackoff(this.#retries, {
      initialDelay: this.#options.retryDelay,
      maxDelay: this.#options.maxRetryDelay,
      multiplier: this.#options.backoffMultiplier,
      jitter: this.#options.backoffJitter,
    });

    this.#retryTimeoutId = Timers.setTimeout(() => {
      this.#retryTimeoutId = null;
      void this.reconnect();
    }, delay);
  };

  /**
   * Performs an individual connection attempt.
   */
  #executeConnect = async (): Promise<void> => {
    if (!this.#shouldReconnect) return;
    if (this.isConnected) return;

    this.#clearRetryTimer();
    this.#connecting = true;

    const attemptToken = ++this.#attemptId;

    return new Promise<void>((resolve) => {
      this.#inFlightResolver = resolve;

      if (
        this.#options.maxRetries !== undefined &&
        this.#options.maxRetries >= 0 &&
        this.#retries >= this.#options.maxRetries
      ) {
        logger.warn(
          "Maximum reconnection attempts reached. Stopping further attempts.",
        );
        this.#shouldReconnect = false;
        this.#connecting = false;
        this.#settleInFlight();
        return;
      }

      let wsInstance: WebSocket;
      try {
        wsInstance = new WebSocket(
          this.#url,
          this.#options.protocols || undefined,
        );
      } catch (error) {
        logger.error("Failed to construct WebSocket:", error);
        this.#connecting = false;
        this.#settleInFlight();
        if (this.#options.reconnectOnError && this.#shouldReconnect) {
          this.#scheduleReconnect();
          this.#retries++;
        }
        return;
      }

      this.#ws = wsInstance;

      wsInstance.onopen = async (event) => {
        if (this.#attemptId !== attemptToken || this.#ws !== wsInstance) {
          return;
        }

        logger.log(TAG, "WebSocket connection established:", this.#url);

        this.#retries = 0;
        this.#connected = true;
        this.#connecting = false;

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
          if (this.#ws?.readyState === WebSocket.OPEN) {
            this.#ws.send(
              typeof message === "string" ? message : JSON.stringify(message),
            );
          }
        }

        if (this.#onOpen) {
          this.#onOpen.call(wsInstance, event as never);
        }
        this.#handlePingPong();
        this.#unQueueMessages();
        this.#settleInFlight();
      };

      wsInstance.onclose = (event) => {
        if (this.#attemptId !== attemptToken) {
          return;
        }

        logger.warn(
          "WebSocket connection closed:",
          this.#url,
          "Code:",
          event.code ?? "No code provided",
          "Reason:",
          event.reason ?? "No reason provided",
        );

        const wasConnected = this.#connected;
        this.#connected = false;
        this.#connecting = false;
        this.#clearPingPong();
        this.#ws = null;
        this.#settleInFlight();

        if (this.#onClose) {
          this.#onClose.call(wsInstance, event as never);
        }

        const shouldAttemptRetry =
          this.#shouldReconnect &&
          (wasConnected
            ? this.#options.reconnectOnClose
            : this.#options.reconnectOnError);

        if (shouldAttemptRetry) {
          this.#scheduleReconnect();
          this.#retries++;
        } else {
          this.#shouldReconnect = false;
        }
      };

      wsInstance.onerror = (event) => {
        if (this.#attemptId !== attemptToken) {
          return;
        }

        logger.error("WebSocket error occurred:", this.#url, "Event:", event);

        if (this.#onError) {
          this.#onError.call(wsInstance, event as never);
        }

        if (!this.#connected && wsInstance.readyState !== WebSocket.OPEN) {
          try {
            wsInstance.close();
          } catch {
            if (this.#attemptId === attemptToken && this.#inFlightResolver) {
              this.#connecting = false;
              this.#settleInFlight();
              if (this.#options.reconnectOnError && this.#shouldReconnect) {
                this.#scheduleReconnect();
                this.#retries++;
              }
            }
          }
        }
      };

      wsInstance.onmessage = (event) => {
        if (this.#attemptId !== attemptToken || this.#ws !== wsInstance) {
          return;
        }

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

        if (this.#onMessage) {
          this.#onMessage.call(wsInstance, event as never);
        }
      };
    }).finally(() => {
      if (this.#attemptId === attemptToken) {
        this.#connecting = false;
        this.#reconnectingPromise = null;
      }
    });
  };

  /**
   * Shuts down the transport and clears pending connection state.
   */
  #closeWs = (reason?: ReasonCloseWS, alreadyClosed?: boolean) => {
    this.#attemptId++;
    this.#clearPingPong();
    this.#connected = false;
    this.#connecting = false;
    this.#settleInFlight();
    this.#reconnectingPromise = null;

    const ws = this.#ws;
    this.#ws = null;

    if (!ws) return;

    logger.log(
      "Closing WebSocket connection:",
      this.#url,
      "Reason:",
      reason || "Not specified",
    );

    if (alreadyClosed) return;

    try {
      ws.close();
    } catch {
      // Ignored
    }
  };

  /**
   * Manually initiates a reconnection attempt.
   */
  public reconnect = async (): Promise<void> => {
    this.#shouldReconnect = true;
    this.#clearRetryTimer();

    if (this.isConnected) return;
    if (this.#reconnectingPromise) return this.#reconnectingPromise;

    this.#reconnectingPromise = this.#executeConnect();
    return this.#reconnectingPromise;
  };

  /**
   * Manually closes the WebSocket connection and disables automatic reconnection.
   */
  public close = () => {
    this.#shouldReconnect = false;
    this.#clearRetryTimer();
    this.#closeWs("manual");
  };

  /**
   * Sets whether automatic reconnection is enabled.
   */
  public set shouldReconnect(value: boolean) {
    this.#shouldReconnect = value;
    if (!value) {
      this.#clearRetryTimer();
      this.#closeWs("manual");
    } else {
      void this.reconnect();
    }
  }

  /**
   * Returns whether automatic reconnection is currently enabled.
   */
  public get shouldReconnect() {
    return this.#shouldReconnect;
  }

  constructor(url: string, options?: OptionsReconnectingWS<T>) {
    this.#url = url;
    this.#options = { ...this.#options, ...options };

    if (this.#options.startClosed) return;
    void this.reconnect();
  }
}
