import ReconnectingWebSocket, {
  OptionsReconnectingWS,
} from "@/utils/reconnecting-websocket";
import {
  ClipboardItem,
  EventClipboardNative,
  ClipboardWebSocketMessage,
} from "@types";
import {
  logger,
  fetchToServer,
  setTimeoutPolyfill,
  setIntervalPolyfill,
  clearIntervalPolyfill,
} from "../functions";
import { REPLACERS } from "../TOP_LEVEL";
import { deviceInfo } from "./deviceInfo";
import { getRandomUUID } from "../cross";
import { sessionManager } from "./session";
import * as ExpoClipboard from "expo-clipboard";
import { ClipboardStorage } from "@common";
import { CLIPBOARD_WS_URL } from "../constants";
import { storageManagement, parseData } from "./storage";
import { DeviceEventEmitter, EmitterSubscription } from "react-native";
import { windowModule, keyboardModule, BackgroundModule } from "@modules";

const OPTIONS_RECONNECT_WS: OptionsReconnectingWS = {
  maxRetries: Infinity,
  minReconnectionDelay: 1500,
  maxReconnectionDelay: 10000,
  reconnectionDelayGrowFactor: 1.5,
  connectionTimeout: 5000,
};

type SendMessageFunc = (
  message: ClipboardWebSocketMessage<"sentByApp">,
) => Promise<void>;

type ClipboardEventType = "items-updated" | "connection-status";

type ArgsListenersClipboard = {
  "items-updated": [items: ClipboardItem[]];
  "last-item-change": [content: string | null];
  "connection-status": [connected: boolean];
};

type ListenersClipboard = {
  [event in ClipboardEventType]?: Record<
    string,
    (...args: ArgsListenersClipboard[event]) => void
  >;
};

type AddEventListener = <T extends ClipboardEventType>(
  event: T,
  callback: (...args: ArgsListenersClipboard[T]) => void,
) => () => void;

type EmitEvent = <T extends ClipboardEventType>(
  event: T,
  ...args: ArgsListenersClipboard[T]
) => void;

type SetClipboardData = <T extends keyof ClipboardStorage>(
  key: T,
  value: ClipboardStorage[T],
) => void;

const getItemWithMaxSize = (
  item: ClipboardItem,
  maxSize: number,
): ClipboardItem => {
  if (maxSize <= 0) return item;
  return { ...item, content: item.content.slice(0, maxSize) };
};

class ClipboardManager {
  #i = 0;
  #clipboardData: ClipboardStorage;
  #clipboardSocket: ReconnectingWebSocket | null = null;
  #clipboardSocketURL: string | null = null;

  #listItemsClipboard: ClipboardItem[] = [];
  #listItemsClipboardNoInternet: ClipboardItem[] = [];

  #intervalId: number | null = null;
  #shouldConnect: boolean = true;

  #listenerClipboard: EmitterSubscription | null = null;
  #removeInternetListener: (() => void) | null = null;
  #removeStatePhoneListener: (() => void) | null = null;

  #initialized = false;
  #initPromise: Promise<void> | null = null;

  private _listeners: ListenersClipboard = {};

  private _emitEvent: EmitEvent = (event, ...args) => {
    const listeners = this._listeners[event];
    if (!listeners) return;

    Object.values(listeners).forEach((callback) => callback?.(...args));
  };

  public getClipboardData = () => this.#clipboardData;

  public existsInClipboard = (content: string) =>
    this.#listItemsClipboard.some((item) => item.content === content);

  public setClipboardData: SetClipboardData = (key, value) => {
    this.#clipboardData[key] = value;
    switch (key) {
      case "enabled":
        if (value) this.cleanup();
        else this.init();
        break;
      case "maxCharsInItem":
        if ((value as number) < 1) this.#clipboardData.maxCharsInItem = -1;
        break;
      case "maxClipboardItems":
        if ((value as number) < 1) this.#clipboardData.maxClipboardItems = 1;
        break;
      default:
        break;
    }
  };

  public addEventListener: AddEventListener = (event, callback) => {
    if (!REPLACERS.isProduction) {
      if (this.#i > 100) {
        const count = Object.values(this._listeners).reduce(
          (acc, listeners) => acc + Object.keys(listeners || {}).length,
          0,
        );
        if (count > 100) {
          logger.warn(
            "CLIPBOARD_MANAGER",
            "Too many clipboard listeners, you may have a memory leak",
          );
        }
      }
    }

    if (!this._listeners[event]) this._listeners[event] = {};
    const id = `${this.#i++}`;
    this._listeners[event][id] = callback;
    return () => {
      delete this._listeners[event]?.[id];
    };
  };

  public removeAllListeners = (event?: ClipboardEventType) => {
    if (event) delete this._listeners[event];
    else this._listeners = {};
  };

  private addToItemsClipboard = (item: ClipboardItem | ClipboardItem[]) => {
    const isArray = Array.isArray(item);

    let newItems = this.#listItemsClipboard.filter((i) =>
      isArray
        ? !item.some((it) => it.content === i.content)
        : i.content !== item.content,
    );

    if (isArray) {
      item.reverse().forEach((it) => {
        if (!it) return;

        newItems.unshift(
          getItemWithMaxSize(it, this.#clipboardData.maxCharsInItem),
        );
      });
    } else
      newItems.unshift(
        getItemWithMaxSize(item, this.#clipboardData.maxCharsInItem),
      );

    if (newItems.length > this.#clipboardData.maxClipboardItems)
      newItems = newItems.slice(0, this.#clipboardData.maxClipboardItems);

    this.#listItemsClipboard = newItems;

    if (REPLACERS.isNative) return;

    windowModule.setClipboardHistory?.(this.#listItemsClipboard);
    this._emitEvent("items-updated", this.#listItemsClipboard);
  };

  private sendMessage: SendMessageFunc = async (message) => {
    const currentSocket = this.#clipboardSocket;

    if (!currentSocket) {
      logger.error(`Cannot send message to clipboard: Socket is null`);
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;

    while (currentSocket.readyState === WebSocket.CONNECTING) {
      if (attempts >= maxAttempts) {
        logger.error(
          `Clipboard WebSocket connection timed out after ${maxAttempts} attempts (still CONNECTING).`,
        );
        return;
      }
      attempts++;
      await new Promise((resolve) => setTimeoutPolyfill(resolve, 1000));
    }

    if (currentSocket.readyState === WebSocket.OPEN) {
      currentSocket.send(JSON.stringify(message));
    } else {
      logger.error(
        `Failed to send message to clipboard: Socket state is ${currentSocket.readyState}`,
      );
    }
  };

  private createClipboardWebSocket = async () => {
    const { userData } = sessionManager.getSessionData();

    if (!userData?.userId) return;
    if (!this.#shouldConnect) return;

    logger.log("Initializing Clipboard WebSocket connection...");
    const socket = new ReconnectingWebSocket(
      this.#clipboardSocketURL || CLIPBOARD_WS_URL,
      [],
      OPTIONS_RECONNECT_WS,
    );

    socket.onopen = async () => {
      const [token, deviceId] = [
        storageManagement.get("USER_SESSION_TOKEN_STORAGE"),
        storageManagement.get("DEVICE_ID"),
      ];

      if (!token || !deviceId) {
        logger.error(
          "No session token or device ID found for Clipboard WebSocket.",
        );
        socket.close();
        return;
      }
      this.#clipboardSocket = socket;

      const message: ClipboardWebSocketMessage<"sentByApp"> = {
        type: "init",
        userId: userData.userId,
        deviceId,
      };
      socket.send(JSON.stringify(message));
      logger.log(
        "Clipboard WebSocket connection opened and init message sent.",
        message,
      );
      this._emitEvent("connection-status", true);
    };

    socket.onerror = (error) => {
      logger.error("Clipboard WebSocket error:", error.message);
      this._emitEvent("connection-status", false);
    };

    socket.onclose = () => {
      logger.log("Clipboard WebSocket connection closed.");
      this._emitEvent("connection-status", false);
    };

    socket.onmessage = (event) => {
      try {
        const parsedMessage: ClipboardWebSocketMessage<"sentByServer"> | null =
          parseData(event.data);

        if (!parsedMessage) return;
        if (parsedMessage.type !== "new-clipboard-item")
          return this.sendMessage({ type: "pong" });

        if (
          this.#listItemsClipboard.some(
            (item) => item.content === parsedMessage.content,
          )
        )
          return;

        this.addToItemsClipboard({
          id: parsedMessage.id,
          content: parsedMessage.content,
        });

        if (REPLACERS.isNative)
          BackgroundModule?.setClipboardText?.(parsedMessage.content);
        else if (REPLACERS.isWeb)
          windowModule?.setClipboard(parsedMessage.content);
      } catch (error) {
        logger.error("Error parsing Clipboard WebSocket message:", error);
      }
    };

    this.#clipboardSocket = socket;
  };

  private initClipboardItems = async () => {
    const { userData } = sessionManager.getSessionData();
    if (!userData?.userId) return;

    const [deviceId, sessionToken, language] = [
      storageManagement.get("DEVICE_ID"),
      storageManagement.get("USER_SESSION_TOKEN_STORAGE"),
      storageManagement.get("LANGUAGE"),
    ];

    if (!sessionToken) return;

    const res = await fetchToServer(
      "/database/fetch",
      {
        lang: language,
        limit: this.#clipboardData.maxClipboardItems,
        table: "ClipboardSync",
        match: { userId: userData.userId, deleted: false },
        orderBy: "createdAt",
        deviceId,
        pagination: true,
        orderDirection: "DESC",
      },
      sessionToken,
    );

    const { data } = res.data || {};
    if (!data) return;

    if (data.length === 0 || !data[0]?.content) return;
    this.addToItemsClipboard(
      data.map((item) => ({ id: item.id || "", content: item.content })),
    );
  };

  private handleInsertItem = (content: string) => {
    if (!content || this.existsInClipboard(content)) return;

    if (
      !deviceInfo.hasInternet ||
      !sessionManager.getSessionData().isLoggedIn
    ) {
      const newItem = { id: getRandomUUID(), content };
      this.#listItemsClipboardNoInternet.push(newItem);
      this.addToItemsClipboard(newItem);
    } else {
      const maxChars = this.#clipboardData.maxCharsInItem;

      this.sendMessage({
        type: "add-new-item",
        content: maxChars > 0 ? content.slice(0, maxChars) : content,
      });
    }
  };

  private handleIntervalClipboardWeb = async () => {
    try {
      let content: string | null = null;

      try {
        content = windowModule.readClipboard();
      } catch {
        // Ignore //! DELETE
      }
      try {
        if (!content)
          content = await ExpoClipboard.getStringAsync({
            preferredFormat: ExpoClipboard.StringFormat.PLAIN_TEXT,
          });
      } catch {
        return;
      }

      this.handleInsertItem(content);
    } catch (error) {
      logger.error("Error reading clipboard content", error);
    }
  };

  private initClipboardNativeListener = () => {
    if (!REPLACERS.isNative) return;

    const listenerClipboard = DeviceEventEmitter.addListener(
      "ClipboardEvent",
      async (event: EventClipboardNative) => {
        switch (event.type) {
          case "update":
            this.handleInsertItem(event?.text);
            break;
          case "show":
            setTimeoutPolyfill(() => {
              if (this.#listItemsClipboard.length === 0) return;

              keyboardModule?.setClipboardSuggestions?.([
                ...(this.#listItemsClipboard || []),
              ]);
            }, 100);
            break;
          case "delete": {
            const idToDelete = event?.id || null;
            const textToDelete = event?.text || null;
            const resolvedId =
              idToDelete ||
              this.#listItemsClipboard.find(
                (item) => item.content === textToDelete,
              )?.id ||
              null;

            if (!resolvedId && !textToDelete) return;

            this.#listItemsClipboard = resolvedId
              ? this.#listItemsClipboard.filter(
                  (item) => item.id !== resolvedId,
                )
              : this.#listItemsClipboard.filter(
                  (item) => item.content !== textToDelete,
                );
            const [lang, deviceId, sessionToken] = [
              storageManagement.get("LANGUAGE"),
              storageManagement.get("DEVICE_ID"),
              storageManagement.get("USER_SESSION_TOKEN_STORAGE"),
            ];
            if (!sessionToken) return;

            const match = resolvedId
              ? { id: resolvedId }
              : textToDelete
                ? { content: textToDelete }
                : null;

            if (!match) return;

            fetchToServer(
              "/database/delete",
              {
                table: "ClipboardSync",
                lang,
                match,
                deviceId,
              },
              sessionToken,
            );
            this._emitEvent("items-updated", this.#listItemsClipboard);
            break;
          }
          default:
            break;
        }
      },
    );

    this.#listenerClipboard = listenerClipboard;
  };

  private initInternetListener = () => {
    if (this.#removeInternetListener) return;

    this.#removeInternetListener = deviceInfo.addEventListener(
      "hasInternet-change",
      (hasInternet) => {
        if (!hasInternet) return;

        if (!this.#listItemsClipboardNoInternet.length) return;

        for (const item of this.#listItemsClipboardNoInternet) {
          this.sendMessage({
            type: "add-new-item",
            content: item.content,
          });
        }
        this.#listItemsClipboardNoInternet = [];
      },
    );
  };

  public init = async () => {
    const load = async () => {
      try {
        if (this.#initialized) return;
        if (this.#initPromise) return this.#initPromise;

        await storageManagement.waitUntilLoaded();
        this.#clipboardData = storageManagement.get("CLIPBOARD", {
          enabled: true,
          maxCharsInItem: -1,
          maxClipboardItems: 10,
        });

        this.cleanup();

        this.#clipboardSocketURL = storageManagement.get(
          "CLIPBOARD_WEBSOCKET_URL",
          null,
        );

        await this.createClipboardWebSocket();

        this.initClipboardItems();

        if (REPLACERS.isWeb) {
          if (this.#intervalId) clearIntervalPolyfill(this.#intervalId);

          this.#intervalId = setIntervalPolyfill(() => {
            this.handleIntervalClipboardWeb();
          }, 500);
        } else {
          this.initClipboardNativeListener();
        }

        this.initInternetListener();

        if (!REPLACERS.isNative) return;

        this.#removeStatePhoneListener = deviceInfo.addEventListener(
          "statePhone-change",
          (statePhone) => {
            if (statePhone !== "suspended") this.resume();
            else this.suspend();
          },
        );
      } catch (error) {
        logger.error(
          "CLIPBOARD",
          "Error initializing ClipboardManager",
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        this.#initialized = true;
        this.#initPromise = null;
      }
    };

    this.#initPromise = load();

    return this.#initPromise;
  };

  public suspend = () => {
    this.#shouldConnect = false;
    const currentSocket = this.#clipboardSocket;

    currentSocket?.close();
    this.#clipboardSocket = null;
    this._emitEvent("connection-status", false);
  };

  public resume = () => {
    this.#shouldConnect = true;
    const currentSocket = this.#clipboardSocket;

    if (!currentSocket || currentSocket.readyState === WebSocket.CLOSED)
      this.createClipboardWebSocket();
    else if (typeof currentSocket.reconnect === "function")
      currentSocket.reconnect();
  };

  public updateSocketURL = (url: string | null) => {
    this.#clipboardSocketURL = url;
    const currentSocket = this.#clipboardSocket;

    const hasDifferentURL =
      !!currentSocket && "url" in currentSocket && currentSocket.url !== url;

    if (
      !currentSocket ||
      currentSocket.readyState === ReconnectingWebSocket.CLOSED ||
      hasDifferentURL
    ) {
      currentSocket?.close?.();
      this.#clipboardSocket = null;
      this.createClipboardWebSocket();
    }
  };

  public cleanup = () => {
    if (this.#intervalId) clearIntervalPolyfill(this.#intervalId);
    if (this.#listenerClipboard) this.#listenerClipboard.remove();
    if (this.#removeInternetListener) this.#removeInternetListener();
    if (this.#removeStatePhoneListener) this.#removeStatePhoneListener();

    this.#clipboardSocket?.close();
    this.#clipboardSocket = null;
    this.removeAllListeners();
  };

  public waitUntilLoaded = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;
    return this.init();
  };

  public getItems = () => this.#listItemsClipboard;
  public getLastItem = () =>
    this.#listItemsClipboard[0] ||
    this.#listItemsClipboardNoInternet[0] ||
    null;

  constructor() {
    this.#clipboardData = storageManagement.get("CLIPBOARD");
    this.init();
  }
}

export const clipboardManager = new ClipboardManager();
