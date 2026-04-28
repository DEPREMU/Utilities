import {
  ReconnectingWebSocket,
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
  setIntervalPolyfill,
  clearIntervalPolyfill,
} from "../functions";
import { cloneDeep } from "lodash";
import { getRandomUUID } from "../cross";
import { sessionManager } from "./session";
import * as ExpoClipboard from "expo-clipboard";
import { REPLACERS, URLS } from "../TOP_LEVEL";
import { storageManagement, parseData } from "./storage";
import { deviceInfo, EventsDeviceInfo } from "./deviceInfo";
import { DeviceEventEmitter, EmitterSubscription } from "react-native";
import { wrapFunctionWithError, ClipboardStorage } from "@common";
import { windowModule, keyboardModule, BackgroundModule } from "@modules";

const TAG = "CLIPBOARD_MANAGER";

const OPTIONS_RECONNECT_WS: OptionsReconnectingWS = {
  retryDelay: REPLACERS.isNative ? 5000 : 2500,
  startClosed: true,
  pingPong: {
    expectedMessage: JSON.stringify({ type: "ping" }),
    expectedResponse: JSON.stringify({ type: "pong" }),
  },
  messagesAfterOpen: [
    async () => {
      await storageManagement.waitUntilLoaded();

      const token = storageManagement.get("USER_SESSION_TOKEN_STORAGE");
      const deviceId = storageManagement.get("DEVICE_ID");

      if (!token || !deviceId) {
        logger.error(
          "No session token or device ID found for Clipboard WebSocket initialization message.",
        );
        return "";
      }
      return JSON.stringify({
        type: "init",
        token,
        deviceId,
      });
    },
  ],
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
) => T extends "enabled" ? Promise<void> : void;

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
  #clipboardSocket: ReconnectingWebSocket = new ReconnectingWebSocket(
    URLS.clipboard,
    OPTIONS_RECONNECT_WS,
  );
  #clipboardSocketURL: string | null = null;

  #updatedItems: boolean = false;
  #listItemsClipboard: ClipboardItem[] = [];
  #listItemsClipboardNoInternet: ClipboardItem[] = [];

  #intervalId: number | null = null;
  #shouldConnect: boolean = true;

  #listenerSession: (() => void) | null = null;
  #listenerClipboard: EmitterSubscription | null = null;
  #removeInternetListener: (() => void) | null = null;
  #removeStatePhoneListener: (() => void) | null = null;
  #isRunningNativeService: boolean = false;

  #initialized = false;
  #initPromise: Promise<void> | null = null;

  private _listeners: ListenersClipboard = {};

  private syncClipboardSuggestionsToModule = () => {
    const func = REPLACERS.isNative
      ? keyboardModule.setClipboardSuggestions
      : windowModule.setClipboardHistory;
    func?.(this.#listItemsClipboard);
    this.#updatedItems = false;
  };

  private _emitEvent: EmitEvent = (event, ...args) => {
    const listeners = this._listeners[event];
    if (!listeners) return;

    Object.values(listeners).forEach((callback) => callback?.(...args));
  };

  public getClipboardData = () => cloneDeep(this.#clipboardData);

  public existsInClipboard = (content: string) =>
    this.#listItemsClipboard.some((item) => item.content === content);

  public setClipboardData: SetClipboardData = (key, value) => {
    this.#clipboardData[key] = value;
    switch (key) {
      case "enabled":
        storageManagement.save("CLIPBOARD", this.#clipboardData);
        if (!value) return this.cleanup() as never;
        else {
          this.#initPromise = this._init();
          return this.#initPromise as never;
        }
      case "maxCharsInItem":
        if ((value as number) < 1) this.#clipboardData.maxCharsInItem = -1;
        break;
      case "maxClipboardItems":
        if ((value as number) < 1) this.#clipboardData.maxClipboardItems = 1;
        break;
      default:
        break;
    }

    storageManagement.save("CLIPBOARD", this.#clipboardData);
    return null as never;
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
    this.#updatedItems = true;

    this.syncClipboardSuggestionsToModule();
    this._emitEvent("items-updated", this.#listItemsClipboard);
  };

  private sendMessage: SendMessageFunc = async (message) => {
    this.#clipboardSocket.send(JSON.stringify(message));
  };

  private createClipboardWebSocket = async () => {
    const { userData } = sessionManager.getSessionData();

    if (!userData?.userId) return;

    this.#clipboardSocket.onOpen = async () => {
      this._emitEvent("connection-status", true);
    };

    this.#clipboardSocket.onError = (error) => {
      logger.error("Clipboard WebSocket error:", error.message || error);
      this._emitEvent("connection-status", false);
    };

    this.#clipboardSocket.onClose = () => {
      logger.log("Clipboard WebSocket connection closed.");
      this._emitEvent("connection-status", false);
    };

    this.#clipboardSocket.onMessage = (event) => {
      try {
        const parsedMessage: ClipboardWebSocketMessage<"sentByServer"> | null =
          parseData(event.data.toString());

        if (!parsedMessage) return;
        if (parsedMessage.type !== "new-clipboard-item") return;

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

    this.#clipboardSocket.url = this.#clipboardSocketURL || URLS.clipboard;
    this.#clipboardSocket.shouldReconnect = this.#shouldConnect;
  };

  private initClipboardItems = async () => {
    const { userData, sessionToken } = sessionManager.getSessionData();
    if (!userData?.userId || !sessionToken) return;

    const lang = storageManagement.get("LANGUAGE");
    const deviceId = storageManagement.get("DEVICE_ID");

    if (!sessionToken) return;

    const res = await fetchToServer(
      "/database/fetch",
      {
        lang,
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

  #lastItemInsertItem = "";
  private handleInsertItem = (content: string) => {
    if (
      !content ||
      content === this.#lastItemInsertItem ||
      this.existsInClipboard(content)
    )
      return;
    this.#lastItemInsertItem = content;

    if (
      !deviceInfo.hasInternet ||
      !sessionManager.getSessionData().isLoggedIn
    ) {
      const newItem: ClipboardItem = { id: getRandomUUID(), content };
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
    if (!REPLACERS.isWeb) return;

    wrapFunctionWithError(
      async () => {
        let content: string = await windowModule.readClipboard();

        if (!content)
          content = await ExpoClipboard.getStringAsync({
            preferredFormat: ExpoClipboard.StringFormat.PLAIN_TEXT,
          });

        if (content) this.handleInsertItem(content);
      },
      async (_, errMsg) => {
        logger.error(TAG, "Error reading clipboard content", errMsg);
      },
    );
  };

  private initClipboardNativeListener = () => {
    if (!REPLACERS.isNative) return;
    if (this.#listenerClipboard) return;

    this.#listenerClipboard = DeviceEventEmitter.addListener(
      "ClipboardEvent",
      async (event: EventClipboardNative) => {
        switch (event.type) {
          case "update":
            this.handleInsertItem(event.text);
            break;
          case "show":
            if (!this.#updatedItems) break;

            this.syncClipboardSuggestionsToModule();
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
            this.syncClipboardSuggestionsToModule();

            const lang = storageManagement.get("LANGUAGE");
            const deviceId = storageManagement.get("DEVICE_ID");
            const sessionToken = storageManagement.get(
              "USER_SESSION_TOKEN_STORAGE",
            );

            this._emitEvent("items-updated", this.#listItemsClipboard);
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
            break;
          }
          default:
            break;
        }
      },
    );
  };

  private initInternetListener = () => {
    if (this.#removeInternetListener) return;

    this.#removeInternetListener = deviceInfo.addEventListener(
      EventsDeviceInfo.hasInternetChange,
      (hasInternet) => {
        if (!hasInternet) return;

        while (this.#listItemsClipboardNoInternet.length) {
          const item = this.#listItemsClipboardNoInternet.shift();
          if (!item) continue;

          this.sendMessage({
            type: "add-new-item",
            content: item.content,
          });
        }
      },
    );
  };

  private initSessionListener = () => {
    if (this.#listenerSession) return;

    const removeListenerLogin = sessionManager.addEventListener(
      "login",
      (err) => {
        if (err) {
          this.cleanup();
          return;
        }

        this.#initPromise = this._init();
      },
    );
    const removeListenerLogout = sessionManager.addEventListener(
      "logout",
      () => {
        this.cleanup();
      },
    );

    this.#listenerSession = () => {
      removeListenerLogin();
      removeListenerLogout();
    };
  };

  private _init = async () => {
    try {
      if (this.#initialized) return;
      if (this.#initPromise) return this.#initPromise;

      await Promise.all([
        this.cleanup(),
        sessionManager.waitUntilLoaded(),
        storageManagement.waitUntilLoaded(),
      ]);

      if (
        REPLACERS.isNative &&
        this.#clipboardData &&
        !this.#isRunningNativeService
      ) {
        BackgroundModule.startClipboardService();
        this.#isRunningNativeService = true;
      }

      this.#clipboardData = storageManagement.get("CLIPBOARD");
      if (!this.#clipboardData) {
        const data = {
          enabled: true,
          maxCharsInItem: -1,
          maxClipboardItems: 10,
        };
        storageManagement.save("CLIPBOARD", data);
        this.#clipboardData = data;
        if (REPLACERS.isNative)
          import("@utils").then(({ setTimeoutPolyfill }) => {
            setTimeoutPolyfill(() => {
              BackgroundModule.startClipboardService();
            }, 10000);
          });
      }

      const { isLoggedIn } = sessionManager.getSessionData();

      if (!isLoggedIn) return;

      this.initClipboardItems();

      if (!this.#clipboardData.enabled) return;

      this.#clipboardSocketURL = storageManagement.get(
        "CLIPBOARD_WEBSOCKET_URL",
        null,
      );

      await this.createClipboardWebSocket();

      if (REPLACERS.isWeb) {
        if (this.#intervalId) clearIntervalPolyfill(this.#intervalId);

        this.#intervalId = setIntervalPolyfill(() => {
          this.handleIntervalClipboardWeb();
        }, 500);
      } else {
        this.initClipboardNativeListener();
        this.#removeStatePhoneListener = deviceInfo.addEventListener(
          EventsDeviceInfo.statePhoneChange,
          (statePhone) => {
            if (statePhone !== "suspended") this.resume();
            else this.suspend();
          },
        );
      }

      this.initSessionListener();
      this.initInternetListener();
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

  public suspend = () => {
    this.#shouldConnect = false;

    this.#clipboardSocket.close();
    this._emitEvent("connection-status", false);
  };

  public resume = () => {
    if (!this.#initialized) return;

    this.#shouldConnect = true;

    const currentSocket = this.#clipboardSocket;
    currentSocket.reconnect();
  };

  public updateSocketURL = (url: string | null) => {
    this.#clipboardSocketURL = url;
    const currentSocket = this.#clipboardSocket;

    const hasDifferentURL =
      !!currentSocket && "url" in currentSocket && currentSocket.url !== url;

    if (!currentSocket.isConnected || hasDifferentURL) {
      currentSocket.close?.();
      this.createClipboardWebSocket();
    }
  };

  public cleanup = async () => {
    clearIntervalPolyfill(this.#intervalId);
    if (this.#listenerSession) this.#listenerSession();
    if (this.#listenerClipboard) this.#listenerClipboard.remove();
    if (this.#removeInternetListener) this.#removeInternetListener();
    if (this.#removeStatePhoneListener) this.#removeStatePhoneListener();
    if (REPLACERS.isNative && this.#isRunningNativeService) {
      BackgroundModule.stopClipboardService();
      this.#isRunningNativeService = false;
    }

    this.#clipboardSocket?.close();
    this.#initialized = false;
  };

  public waitUntilLoaded = async () => {
    if (this.#initialized) return;
    if (this.#initPromise) return this.#initPromise;

    this.#initPromise = this._init();
    return this.#initPromise;
  };

  public getItems = () => this.#listItemsClipboard;
  public getLastItem = () =>
    this.#listItemsClipboard[0] ||
    this.#listItemsClipboardNoInternet[0] ||
    null;

  constructor() {
    this.#clipboardData = null as never;
    this.#initPromise = this._init();
  }
}

export const clipboardManager = new ClipboardManager();
