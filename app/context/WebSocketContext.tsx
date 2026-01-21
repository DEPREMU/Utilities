import ReconnectingWebSocket, {
  OptionsReconnectingWS,
} from "@/utils/reconnecting-websocket";
import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
} from "react";
import {
  log,
  logError,
  parseData,
  getRandomId,
  checkLanguage,
  fetchToServer,
  URL_WEB_SOCKET,
  loadDataStorage,
  CLIPBOARD_WS_URL,
  getNotifications,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
  tTyped,
} from "@utils";
import { useModal } from "./ModalContext";
import windowModule from "@/utils/modules/WindowModule";
import keyboardModule from "@/utils/modules/KeyboardModule";
import { useLanguage } from "./LanguageContext";
import BackgroundModule from "@/utils/modules/BackgroundModule";
import { useBackground } from "./BackgroundContext";
import { useUserContext } from "./UserContext";
import * as ExpoClipboard from "expo-clipboard";
import { useNotifications } from "./NotificationsContext";
import { DeviceEventEmitter, Platform } from "react-native";
import { WebSocketMessage, ClipboardWebSocketMessage } from "@types";

type WebSockets = "clipboard" | "main";

type SendMessageFunc = <T extends WebSockets>(
  ws: T,
  message: T extends "clipboard"
    ? ClipboardWebSocketMessage<"sentByApp">
    : WebSocketMessage<"sentByApp">,
) => Promise<void>;

interface WebSocketContextType {
  setSocketURL: React.Dispatch<React.SetStateAction<string | null>>;
  sendMessageRef: React.RefObject<SendMessageFunc>;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

interface ShouldConnect {
  main: boolean;
  clipboard: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

const MAX_CLIPBOARD_ITEMS = Platform.OS === "web" ? 30 : 15;

const OPTIONS_RECONNECT_WS: OptionsReconnectingWS = {
  maxRetries: Infinity,
  minReconnectionDelay: 1500,
  maxReconnectionDelay: 10000,
  reconnectionDelayGrowFactor: 1.5,
  connectionTimeout: 5000,
};

const addToItemsClipboard = (
  item: string | string[],
  listRef: React.RefObject<string[]>,
) => {
  if (Array.isArray(item)) {
    item.reverse().forEach((it) => {
      if (!it) return;
      listRef.current.unshift(it);
    });
  } else listRef.current.unshift(item);

  if (listRef.current.length > MAX_CLIPBOARD_ITEMS)
    listRef.current = listRef.current.slice(0, MAX_CLIPBOARD_ITEMS);

  if (Platform.OS !== "web") return;

  windowModule.setClipboardHistory?.(listRef.current);
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { language } = useLanguage();
  const { statePhone } = useBackground();
  const { openSnackBarRef } = useModal();
  const { sendNotificationRef } = useNotifications();
  const { userData, isLoggedIn } = useUserContext();
  const { isBackground, initIntervalTimeoutsRef, deleteIntervalTimeoutRef } =
    useBackground();

  const [socketURL, setSocketURL] = useState<string | null>(null);
  const [clipboardSocketURL, setClipboardSocketURL] = useState<string | null>(
    null,
  );

  const socketRef = useRef<ReconnectingWebSocket | null>(null);
  const lastItemCopiedRef = useRef<string | null>(null);
  const clipboardSocketRef = useRef<ReconnectingWebSocket | null>(null);
  const listItemsClipboardRef = useRef<string[]>([]);
  const createMainWebSocketRef = useRef<((url: string) => void) | null>(null);
  const createClipboardWebSocketRef = useRef<(() => void) | null>(null);
  const shouldConnectRef = useRef<ShouldConnect>({
    main: true,
    clipboard: true,
  });

  const sendMessageRef = useRef<SendMessageFunc>(async (ws, message) => {
    const currentSocket =
      ws === "clipboard" ? clipboardSocketRef.current : socketRef.current;

    if (!currentSocket) {
      logError(`Cannot send message to ${ws}: Socket is null`);
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;

    while (currentSocket.readyState === WebSocket.CONNECTING) {
      if (attempts >= maxAttempts) {
        logError(
          `WebSocket ${ws} connection timed out after ${maxAttempts} attempts (still CONNECTING).`,
        );
        return;
      }
      attempts += 1;
      await new Promise((resolve) => setTimeoutPolyfill(resolve, 1000));
    }

    if (currentSocket.readyState === WebSocket.OPEN) {
      currentSocket.send(JSON.stringify(message));
    } else {
      logError(
        `Failed to send message to ${ws}: Socket state is ${currentSocket.readyState}`,
      );
    }
  });

  const createMainWebSocket = useCallback(
    (url: string) => {
      if (!userData?.userId) return;
      if (!shouldConnectRef.current.main) return;

      socketRef.current?.close();

      const handleInitSuccessWebSocket = () => {
        openSnackBarRef.current(
          tTyped("welcomeUser", { user: userData?.name || tTyped("dearUser") }),
          3000,
          {
            label: tTyped("common.close"),
          },
        );
        log("WebSocket initialized successfully.");
      };

      const newSocket = new ReconnectingWebSocket(
        url,
        [],
        OPTIONS_RECONNECT_WS,
      );

      newSocket.onopen = async () => {
        log("WebSocket connection opened successfully");

        try {
          const [lang, notifications, hasAdmin, theme] = await Promise.all([
            checkLanguage(),
            getNotifications(),
            loadDataStorage("HAS_ADMIN_ACCESS"),
            loadDataStorage("THEME"),
          ]);

          sendMessageRef.current("main", {
            type: "init",
            userId: userData?.userId || "",
            notifications,
            theme: theme || "auto",
            language: lang || "en",
            hasAdmin: !!hasAdmin,
          });

          if (notifications)
            sendMessageRef.current("main", {
              type: "notifications",
              data: notifications,
              userId: userData?.userId || "",
            });
        } catch (error) {
          logError("Error during WebSocket initialization:", error);
        }
      };

      newSocket.onmessage = async (event) => {
        try {
          const parsedMessage: WebSocketMessage<"sentByServer"> | null =
            parseData(event.data);
          if (!parsedMessage) return;
          log("Message from server:", parsedMessage);

          if (!parsedMessage.type) {
            logError("Received message without type:", parsedMessage);
            return;
          }

          switch (parsedMessage.type) {
            case "init-success":
              handleInitSuccessWebSocket();
              break;
            case "not-user-id":
              logError("No user ID provided:", parsedMessage.message);
              break;
            case "notification":
              await sendNotificationRef.current(parsedMessage.notification);
              break;
            case "ping":
              sendMessageRef.current("main", { type: "pong" });
              break;
            default:
              log("Unknown message type:", parsedMessage);
              break;
          }
        } catch (error) {
          logError("Error processing WebSocket message:", error);
        }
      };

      newSocket.onerror = (error) => {
        logError("WebSocket error:", error.message);
      };

      newSocket.onclose = (event) => {
        log("WebSocket connection closed:", event.reason, event.code);
      };

      socketRef.current = newSocket;
    },
    [openSnackBarRef, userData?.name, userData?.userId, sendNotificationRef],
  );

  const createClipboardWebSocket = useCallback(async () => {
    if (!userData?.userId) return;
    if (!shouldConnectRef.current.clipboard) return;

    log("Initializing Clipboard WebSocket connection...");
    const socket = new ReconnectingWebSocket(
      clipboardSocketURL || CLIPBOARD_WS_URL,
      [],
      OPTIONS_RECONNECT_WS,
    );

    socket.onopen = async () => {
      const [token, deviceId] = await Promise.all([
        loadDataStorage("USER_SESSION_TOKEN_STORAGE"),
        loadDataStorage("DEVICE_ID"),
      ]);

      if (!token || !deviceId) {
        logError(
          "No session token or device ID found for Clipboard WebSocket.",
        );
        socket.close();
        return;
      }
      clipboardSocketRef.current = socket;

      const message: ClipboardWebSocketMessage<"sentByApp"> = {
        type: "init",
        userId: userData.userId,
        deviceId,
      };
      socket.send(JSON.stringify(message));
      log(
        "Clipboard WebSocket connection opened and init message sent.",
        message,
      );
    };

    socket.onerror = (error) => {
      logError("Clipboard WebSocket error:", error.message);
    };

    socket.onclose = () => {
      log("Clipboard WebSocket connection closed.");
    };

    socket.onmessage = (event) => {
      try {
        const parsedMessage: ClipboardWebSocketMessage<"sentByServer"> | null =
          parseData(event.data);

        if (!parsedMessage) return;
        if (parsedMessage.type !== "new-clipboard-item")
          return sendMessageRef.current("clipboard", { type: "pong" });

        if (parsedMessage.content === lastItemCopiedRef.current) return;

        addToItemsClipboard(parsedMessage.content, listItemsClipboardRef);

        lastItemCopiedRef.current = parsedMessage.content;

        if (Platform.OS === "android")
          BackgroundModule?.setClipboardText?.(parsedMessage.content);
        else if (Platform.OS === "web")
          windowModule?.setClipboard(parsedMessage.content);
      } catch (error) {
        logError("Error parsing Clipboard WebSocket message:", error);
      }
    };

    clipboardSocketRef.current = socket;
  }, [clipboardSocketURL, userData?.userId]);
  createMainWebSocketRef.current = createMainWebSocket;
  createClipboardWebSocketRef.current = createClipboardWebSocket;

  useEffect(() => {
    loadDataStorage("WEBSOCKET_URL", null).then((data) => setSocketURL(data));
    loadDataStorage("CLIPBOARD_WEBSOCKET_URL", null).then((data) =>
      setClipboardSocketURL(data),
    );
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !userData?.userId) return;
    createClipboardWebSocketRef.current?.();

    if (lastItemCopiedRef.current) return;

    const initClipboardItems = async () => {
      const [deviceId, sessionToken] = await Promise.all([
        loadDataStorage("DEVICE_ID"),
        loadDataStorage("USER_SESSION_TOKEN_STORAGE"),
      ]);

      if (!sessionToken) return;
      lastItemCopiedRef.current = getRandomId();

      const res = await fetchToServer(
        "/database/fetch",
        {
          lang: language,
          limit: MAX_CLIPBOARD_ITEMS,
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
      lastItemCopiedRef.current = data[0].content;
      addToItemsClipboard(
        data.map((item) => item.content),
        listItemsClipboardRef,
      );
    };

    const id = setTimeoutPolyfill(initClipboardItems, 1500);

    return () => clearTimeoutPolyfill(id);
  }, [userData?.userId, isLoggedIn, language]);

  useEffect(() => {
    if (!isBackground) {
      log("App became active");
      shouldConnectRef.current.main = true;
      return;
    }

    shouldConnectRef.current.main = false;

    const currentSocket = socketRef.current;
    currentSocket?.close();
    socketRef.current = null;
  }, [isBackground]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!isLoggedIn) return;

    const handleIntervalClipboardWeb = async () => {
      try {
        let content: string | null = null;

        try {
          content = windowModule?.readClipboard();
        } catch {
          // Ignore
        }
        try {
          if (!content)
            content = await ExpoClipboard.getStringAsync({
              preferredFormat: ExpoClipboard.StringFormat.PLAIN_TEXT,
            });
        } catch {
          return;
        }
        if (!content || lastItemCopiedRef.current === content) return;

        lastItemCopiedRef.current = content;
        addToItemsClipboard(content, listItemsClipboardRef);

        sendMessageRef.current("clipboard", {
          type: "add-new-item",
          content,
        });
      } catch (error) {
        logError("Error reading clipboard content", error);
      }
    };

    initIntervalTimeoutsRef.current("clipboardWeb", {
      fn: handleIntervalClipboardWeb,
      type: "interval",
      interval: 500,
      workWithInternet: true,
      shouldRestartAuto: true,
      shouldStopWhenSuspend: false,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => deleteIntervalTimeoutRef.current("clipboardWeb");
  }, [
    userData?.userId,
    isLoggedIn,
    initIntervalTimeoutsRef,
    deleteIntervalTimeoutRef,
  ]);

  useEffect(() => {
    if (statePhone !== "suspended") {
      shouldConnectRef.current.clipboard = true;
      const currentSocket =
        clipboardSocketRef.current as ReconnectingWebSocket | null;

      if (!currentSocket || currentSocket.readyState === WebSocket.CLOSED)
        createClipboardWebSocketRef.current?.();
      else if (typeof currentSocket.reconnect === "function")
        currentSocket.reconnect();

      return;
    }

    shouldConnectRef.current.clipboard = false;
    const currentSocket =
      clipboardSocketRef.current as ReconnectingWebSocket | null;

    currentSocket?.close();
    clipboardSocketRef.current = null;
  }, [statePhone]);

  useEffect(() => {
    if (!isLoggedIn || !userData?.userId) return;
    if (!shouldConnectRef.current.clipboard) return;

    const targetURL = clipboardSocketURL || CLIPBOARD_WS_URL;
    const currentSocket =
      clipboardSocketRef.current as ReconnectingWebSocket | null;

    const hasDifferentURL =
      !!currentSocket &&
      "url" in currentSocket &&
      currentSocket.url !== targetURL;

    if (
      !currentSocket ||
      currentSocket.readyState === ReconnectingWebSocket.CLOSED ||
      hasDifferentURL
    ) {
      currentSocket?.close?.();
      clipboardSocketRef.current = null;
      createClipboardWebSocketRef.current?.();
    }
  }, [clipboardSocketURL, isLoggedIn, userData?.userId]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const listenerClipboard = DeviceEventEmitter.addListener(
      "ClipboardUpdated",
      (event: { text: string }) => {
        const content = event?.text;
        if (!content || lastItemCopiedRef.current === content) return;

        addToItemsClipboard(content, listItemsClipboardRef);
        lastItemCopiedRef.current = content;

        sendMessageRef.current("clipboard", {
          type: "add-new-item",
          content,
        });
      },
    );

    const listenerShowClipboardKeyboard = DeviceEventEmitter.addListener(
      "showClipboard",
      (_data: { show: boolean }) => {
        setTimeoutPolyfill(() => {
          if (listItemsClipboardRef.current.length === 0) return;

          keyboardModule?.setClipboardSuggestions?.([
            ...(listItemsClipboardRef.current || []),
          ]);
        }, 100);
      },
    );

    return () => {
      listenerClipboard.remove();
      listenerShowClipboardKeyboard.remove();
    };
  }, []);

  useEffect(() => {
    if (!shouldConnectRef.current.main && isBackground) return;
    if (!isLoggedIn || !userData?.userId) return;

    const targetURL = socketURL || URL_WEB_SOCKET;

    const currentSocket = socketRef.current;

    if (
      !currentSocket ||
      currentSocket.readyState === ReconnectingWebSocket.CLOSED
    ) {
      createMainWebSocketRef.current?.(targetURL);
      return;
    }

    if ("url" in currentSocket && currentSocket.url !== targetURL) {
      currentSocket.close();
      socketRef.current = null;
      createMainWebSocketRef.current?.(targetURL);
      return;
    }

    if (typeof currentSocket.reconnect === "function") {
      currentSocket.reconnect();
    }
  }, [socketURL, isLoggedIn, userData?.userId, isBackground]);

  useEffect(() => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;

    sendMessageRef.current("main", {
      type: "language-change",
      language,
    });
  }, [language]);

  const value: WebSocketContextType = useMemo(
    () => ({
      setSocketURL,
      sendMessageRef,
    }),
    [],
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};
