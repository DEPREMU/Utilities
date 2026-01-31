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
  tTyped,
  logger,
  parseData,
  REPLACERS,
  getRandomId,
  fetchToServer,
  URL_WEB_SOCKET,
  CLIPBOARD_WS_URL,
  storageManagement,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
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
import { DeviceEventEmitter } from "react-native";
import {
  WebSocketMessage,
  ClipboardWebSocketMessage,
  EventClipboardNative,
  ClipboardItem,
} from "@types";

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

const MAX_CLIPBOARD_ITEMS = REPLACERS.isWeb ? 30 : 15;

const OPTIONS_RECONNECT_WS: OptionsReconnectingWS = {
  maxRetries: Infinity,
  minReconnectionDelay: 1500,
  maxReconnectionDelay: 10000,
  reconnectionDelayGrowFactor: 1.5,
  connectionTimeout: 5000,
};

const addToItemsClipboard = (
  item: ClipboardItem | ClipboardItem[],
  listRef: React.RefObject<ClipboardItem[]>,
) => {
  const isArray = Array.isArray(item);

  let newItems = listRef.current.filter((i) =>
    isArray
      ? !item.some((it) => it.content === i.content)
      : i.content !== item.content,
  );

  if (isArray) {
    item.reverse().forEach((it) => {
      if (!it) return;
      newItems.unshift(it);
    });
  } else newItems.unshift(item);

  if (newItems.length > MAX_CLIPBOARD_ITEMS)
    newItems = newItems.slice(0, MAX_CLIPBOARD_ITEMS);

  listRef.current = newItems;

  if (REPLACERS.isNative) return;

  windowModule.setClipboardHistory?.(listRef.current);
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { language } = useLanguage();
  const { openSnackBarRef } = useModal();
  const { sendNotificationRef } = useNotifications();
  const { statePhone, statesRef, hasInternet } = useBackground();
  const { userData, isLoggedIn, sessionToken } = useUserContext();
  const { isBackground, initIntervalTimeoutsRef, deleteIntervalTimeoutRef } =
    useBackground();

  const [socketURL, setSocketURL] = useState<string | null>(null);
  const [clipboardSocketURL, setClipboardSocketURL] = useState<string | null>(
    null,
  );

  const socketRef = useRef<ReconnectingWebSocket | null>(null);
  const lastItemCopiedRef = useRef<string | null>(null);
  const clipboardSocketRef = useRef<ReconnectingWebSocket | null>(null);
  const listItemsClipboardRef = useRef<ClipboardItem[]>([]);
  const createMainWebSocketRef = useRef<((url: string) => void) | null>(null);
  const createClipboardWebSocketRef = useRef<(() => void) | null>(null);
  const listItemsClipboardNoInternetRef = useRef<ClipboardItem[]>([]);
  const shouldConnectRef = useRef<ShouldConnect>({
    main: true,
    clipboard: true,
  });

  const sendMessageRef = useRef<SendMessageFunc>(async (ws, message) => {
    const currentSocket =
      ws === "clipboard" ? clipboardSocketRef.current : socketRef.current;

    if (!currentSocket) {
      logger.error(`Cannot send message to ${ws}: Socket is null`);
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;

    while (currentSocket.readyState === WebSocket.CONNECTING) {
      if (attempts >= maxAttempts) {
        logger.error(
          `WebSocket ${ws} connection timed out after ${maxAttempts} attempts (still CONNECTING).`,
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
        logger.log("WebSocket initialized successfully.");
      };

      const newSocket = new ReconnectingWebSocket(
        url,
        [],
        OPTIONS_RECONNECT_WS,
      );

      newSocket.onopen = async () => {
        logger.log("WebSocket connection opened successfully");

        try {
          const [lang, hasAdmin, theme] = [
            storageManagement.get("LANGUAGE"),
            storageManagement.get("HAS_ADMIN_ACCESS"),
            storageManagement.get("THEME"),
          ];

          sendMessageRef.current("main", {
            type: "init",
            userId: userData?.userId || "",
            theme: theme || "auto",
            language: lang || "en",
            hasAdmin: !!hasAdmin,
          });
        } catch (error) {
          logger.error("Error during WebSocket initialization:", error);
        }
      };

      newSocket.onmessage = async (event) => {
        try {
          const parsedMessage: WebSocketMessage<"sentByServer"> | null =
            parseData(event.data);
          if (!parsedMessage) return;
          logger.log("Message from server:", parsedMessage);

          if (!parsedMessage.type) {
            logger.error("Received message without type:", parsedMessage);
            return;
          }

          switch (parsedMessage.type) {
            case "init-success":
              handleInitSuccessWebSocket();
              break;
            case "not-user-id":
              logger.error("No user ID provided:", parsedMessage.message);
              break;
            case "notification":
              await sendNotificationRef.current(parsedMessage.notification);
              break;
            case "ping":
              sendMessageRef.current("main", { type: "pong" });
              break;
            default:
              logger.log("Unknown message type:", parsedMessage);
              break;
          }
        } catch (error) {
          logger.error("Error processing WebSocket message:", error);
        }
      };

      newSocket.onerror = (error) => {
        logger.error("WebSocket error:", error.message);
      };

      newSocket.onclose = (event) => {
        logger.log("WebSocket connection closed:", event.reason, event.code);
      };

      socketRef.current = newSocket;
    },
    [openSnackBarRef, userData?.name, userData?.userId, sendNotificationRef],
  );

  const createClipboardWebSocket = useCallback(async () => {
    if (!userData?.userId) return;
    if (!shouldConnectRef.current.clipboard) return;

    logger.log("Initializing Clipboard WebSocket connection...");
    const socket = new ReconnectingWebSocket(
      clipboardSocketURL || CLIPBOARD_WS_URL,
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
      clipboardSocketRef.current = socket;

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
    };

    socket.onerror = (error) => {
      logger.error("Clipboard WebSocket error:", error.message);
    };

    socket.onclose = () => {
      logger.log("Clipboard WebSocket connection closed.");
    };

    socket.onmessage = (event) => {
      try {
        const parsedMessage: ClipboardWebSocketMessage<"sentByServer"> | null =
          parseData(event.data);

        if (!parsedMessage) return;
        if (parsedMessage.type !== "new-clipboard-item")
          return sendMessageRef.current("clipboard", { type: "pong" });

        if (parsedMessage.content === lastItemCopiedRef.current) return;

        addToItemsClipboard(
          {
            id: parsedMessage.id,
            content: parsedMessage.content,
          },
          listItemsClipboardRef,
        );

        lastItemCopiedRef.current = parsedMessage.content;

        if (REPLACERS.isNative)
          BackgroundModule?.setClipboardText?.(parsedMessage.content);
        else if (REPLACERS.isWeb)
          windowModule?.setClipboard(parsedMessage.content);
      } catch (error) {
        logger.error("Error parsing Clipboard WebSocket message:", error);
      }
    };

    clipboardSocketRef.current = socket;
  }, [clipboardSocketURL, userData?.userId]);
  createMainWebSocketRef.current = createMainWebSocket;
  createClipboardWebSocketRef.current = createClipboardWebSocket;

  useEffect(() => {
    setSocketURL(storageManagement.get("WEBSOCKET_URL", null));
    setClipboardSocketURL(
      storageManagement.get("CLIPBOARD_WEBSOCKET_URL", null),
    );
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !userData?.userId) return;
    createClipboardWebSocketRef.current?.();

    if (lastItemCopiedRef.current) return;

    const initClipboardItems = async () => {
      const [deviceId, sessionToken] = [
        storageManagement.get("DEVICE_ID"),
        storageManagement.get("USER_SESSION_TOKEN_STORAGE"),
      ];

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
        data.map((item) => ({ id: item.id || "", content: item.content })),
        listItemsClipboardRef,
      );
    };

    const id = setTimeoutPolyfill(initClipboardItems, 1500);

    return () => clearTimeoutPolyfill(id);
  }, [userData?.userId, isLoggedIn, language]);

  useEffect(() => {
    if (!isBackground) {
      logger.log("App became active");
      shouldConnectRef.current.main = true;
      return;
    }

    shouldConnectRef.current.main = false;

    const currentSocket = socketRef.current;
    currentSocket?.close();
    socketRef.current = null;
  }, [isBackground]);

  useEffect(() => {
    if (REPLACERS.isNative) return;
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
        if (!statesRef.current.hasInternet)
          addToItemsClipboard(
            { id: getRandomId(), content },
            listItemsClipboardNoInternetRef,
          );
        else
          sendMessageRef.current("clipboard", {
            type: "add-new-item",
            content,
          });
      } catch (error) {
        logger.error("Error reading clipboard content", error);
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
    statesRef,
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
    if (REPLACERS.isWeb) return;

    const listenerClipboard = DeviceEventEmitter.addListener(
      "ClipboardEvent",
      async (event: EventClipboardNative) => {
        switch (event.type) {
          case "update":
            {
              const content = event?.text;
              if (!content || lastItemCopiedRef.current === content) return;

              if (statesRef.current.hasInternet)
                sendMessageRef.current("clipboard", {
                  type: "add-new-item",
                  content,
                });
              else
                addToItemsClipboard(
                  { id: getRandomId(), content },
                  listItemsClipboardNoInternetRef,
                );
            }
            break;
          case "show":
            setTimeoutPolyfill(() => {
              if (listItemsClipboardRef.current.length === 0) return;

              keyboardModule?.setClipboardSuggestions?.([
                ...(listItemsClipboardRef.current || []),
              ]);
            }, 100);
            break;
          case "delete": {
            const idToDelete = event?.id || null;
            const textToDelete = event?.text || null;
            const resolvedId =
              idToDelete ||
              listItemsClipboardRef.current.find(
                (item) => item.content === textToDelete,
              )?.id ||
              null;

            if (!resolvedId && !textToDelete) return;

            listItemsClipboardRef.current = resolvedId
              ? listItemsClipboardRef.current.filter(
                  (item) => item.id !== resolvedId,
                )
              : listItemsClipboardRef.current.filter(
                  (item) => item.content !== textToDelete,
                );
            const [lang, deviceId] = [
              storageManagement.get("LANGUAGE"),
              storageManagement.get("DEVICE_ID"),
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
                deviceId,
                lang,
                match,
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

    return () => listenerClipboard.remove();
  }, [statesRef, sessionToken]);

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

  useEffect(() => {
    if (!hasInternet) return;
    if (!listItemsClipboardNoInternetRef.current.length) return;

    for (const item of listItemsClipboardNoInternetRef.current) {
      sendMessageRef.current("clipboard", {
        type: "add-new-item",
        content: item.content,
      });
    }
    listItemsClipboardNoInternetRef.current = [];
  }, [hasInternet]);

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
