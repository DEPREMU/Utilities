import {
  WebSocketMessage,
  WebSocketResponse,
  ClipboardWebSocketMessage,
} from "@types";
import React, {
  useRef,
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
} from "react";
import {
  log,
  isFalsy,
  logError,
  loadData,
  parseData,
  checkLanguage,
  fetchToServer,
  stringifyData,
  URL_WEB_SOCKET,
  loadDataSecure,
  CLIPBOARD_WS_URL,
  getNotifications,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import { v4 } from "uuid";
import { isEqual } from "lodash";
import { Platform } from "react-native";
import { useModal } from "./ModalContext";
import windowModule from "@/utils/modules/WindowModule";
import { useLanguage } from "./LanguageContext";
import BackgroundModule from "@/utils/modules/BackgroundModule";
import { useBackground } from "./BackgroundContext";
import { useUserContext } from "./UserContext";
import * as ExpoClipboard from "expo-clipboard";
import { useNotifications } from "./NotificationsContext";

type WebSockets = "clipboard" | "main";
interface WebSocketContextType {
  socket: WebSocket | null;
  setSocketURL: React.Dispatch<React.SetStateAction<string | null>>;
  sendMessageRef: React.RefObject<
    <T extends WebSockets>(
      ws: T,
      message: T extends "clipboard"
        ? ClipboardWebSocketMessage
        : WebSocketMessage,
    ) => Promise<void>
  >;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

interface IsConnecting {
  main: boolean;
  clipboard: boolean;
}

interface ShouldConnect {
  main: boolean;
  clipboard: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { statePhone } = useBackground();
  const { t, language } = useLanguage();
  const { openSnackBar } = useModal();
  const { sendNotificationRef } = useNotifications();
  const { userData, isLoggedIn } = useUserContext();
  const { isBackground, initIntervalTimeouts, deleteIntervalTimeout } =
    useBackground();

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketURL, setSocketURL] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [clipboardSocketURL, setClipboardSocketURL] = useState<string | null>(
    null,
  );

  const isConnectingWs = useRef<IsConnecting>({
    main: false,
    clipboard: false,
  });
  const socketRef = useRef<WebSocket | null>(null);
  const lastItemCopied = useRef<string | null>(null);
  const clipboardSocketRef = useRef<WebSocket | null>(null);
  const connectionTimeoutId = useRef<NodeJS.Timeout | number | null>(null);
  const shouldConnect = useRef<ShouldConnect>({
    main: true,
    clipboard: true,
  });
  const clipboardReconnectTimeoutRef = useRef<NodeJS.Timeout | number | null>(
    null,
  );

  const sendMessage = useCallback(
    async <T extends WebSockets>(
      ws: T,
      message: T extends "clipboard"
        ? ClipboardWebSocketMessage
        : WebSocketMessage,
    ) => {
      const currentSocket =
        ws === "clipboard" ? clipboardSocketRef.current : socketRef.current;
      if (!currentSocket) return;

      let attempts = 0;
      const maxAttempts = 5;
      while (currentSocket.readyState === WebSocket.CONNECTING) {
        if (attempts >= maxAttempts) {
          logError(
            `WebSocket ${ws} connection timed out after ${maxAttempts} attempts.`,
          );
          return;
        }
        attempts += 1;
        log("WebSocket is not connected. Retrying in 1 second...");
        await new Promise((resolve) => setTimeoutPolyfill(resolve, 1000));
      }
      if (currentSocket.readyState !== WebSocket.OPEN) return;
      currentSocket.send(JSON.stringify(message));
    },
    [],
  );
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const createMainWebSocket = useCallback(
    (url: string) => {
      if (!userData?.userId) return null;
      if (isConnectingWs.current.main || !shouldConnect.current) {
        log("Skipping connection: already connecting or should not connect");
        return;
      }

      if (socketRef.current) {
        log("Closing existing WebSocket connection");
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }

      if (connectionTimeoutId.current) {
        clearTimeoutPolyfill(connectionTimeoutId.current);
        connectionTimeoutId.current = null;
      }

      log(`Creating WebSocket connection to: ${url}`);
      isConnectingWs.current.main = true;

      const handleInitSuccessWebSocket = () => {
        openSnackBar(
          t("welcomeUser", { user: userData?.name || t("dearUser") }),
          3000,
          {
            label: t("close"),
          },
        );
        log("WebSocket initialized successfully.");
      };

      const handleCloseWs = () => {
        isConnectingWs.current.main = false;
        setIsConnected(false);
      };

      const newSocket = new WebSocket(url);

      newSocket.onopen = async () => {
        log("WebSocket connection opened successfully");
        isConnectingWs.current.main = false;
        setIsConnected(true);

        try {
          const [lang, notifications, hasAdmin, theme] = await Promise.all([
            checkLanguage(),
            getNotifications(),
            loadData("@hasAdminAccess"),
            loadData("@theme"),
          ]);

          const initMessage: WebSocketMessage = {
            type: "init",
            userId: userData?.userId || "",
            notifications,
            theme: theme || "auto",
            language: lang || "en",
            hasAdmin: !!hasAdmin,
          };

          newSocket.send(stringifyData(initMessage));

          if (notifications) {
            const notificationMessage: WebSocketMessage = {
              type: "notifications",
              data: notifications,
              userId: userData?.userId || "",
            };
            newSocket.send(JSON.stringify(notificationMessage));
          }
        } catch (error) {
          logError("Error during WebSocket initialization:", error);
        }
      };

      newSocket.onmessage = async (event) => {
        try {
          const parsedMessage: WebSocketResponse | null = parseData(event.data);
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
            default:
              log("Unknown message type:", parsedMessage);
              break;
          }
        } catch (error) {
          logError("Error processing WebSocket message:", error);
        }
      };

      newSocket.onerror = (error) => {
        logError("WebSocket error:", error);
        handleCloseWs();
      };

      newSocket.onclose = (event) => {
        log("WebSocket connection closed:", event);
        handleCloseWs();
      };

      setSocket(newSocket);
    },
    [openSnackBar, t, userData?.name, userData?.userId, sendNotificationRef],
  );

  const createClipboardWebSocket = useCallback(async () => {
    if (!userData?.userId) return;
    if (isConnectingWs.current.clipboard) return;
    if (!shouldConnect.current.clipboard) return;
    isConnectingWs.current.clipboard = true;

    const retryConnection = async (socket: WebSocket) => {
      if (isConnectingWs.current.clipboard) return;
      if (!shouldConnect.current.clipboard) return;

      isConnectingWs.current.clipboard = true;

      clipboardSocketRef.current = null;
      try {
        socket.close();
      } catch {
        // Ignore closing errors
      }

      if (clipboardReconnectTimeoutRef.current)
        clearTimeoutPolyfill(clipboardReconnectTimeoutRef.current);

      clipboardReconnectTimeoutRef.current = setTimeoutPolyfill(
        createClipboardWebSocket,
        3000,
      );
    };

    log("Initializing Clipboard WebSocket connection...");
    const socket = new WebSocket(clipboardSocketURL || CLIPBOARD_WS_URL);

    socket.onopen = async () => {
      isConnectingWs.current.clipboard = false;
      const [token, deviceId] = await Promise.all([
        loadDataSecure("_userSessionTokenStorage"),
        loadDataSecure("_deviceId"),
      ]);

      if (!token || !deviceId) {
        logError(
          "No session token or device ID found for Clipboard WebSocket.",
        );
        socket.close();
        return;
      }
      clipboardSocketRef.current = socket;

      const message: ClipboardWebSocketMessage = {
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
      isConnectingWs.current.clipboard = false;
      logError("Clipboard WebSocket error:", error);
      retryConnection(socket);
    };

    socket.onclose = () => {
      log("Clipboard WebSocket connection closed.");
      retryConnection(socket);
    };

    socket.onmessage = (event) => {
      try {
        const parsedMessage: ClipboardWebSocketMessage | null = parseData(
          event.data,
        );

        if (!parsedMessage) return;
        if (parsedMessage.type !== "new-clipboard-item") return;
        if (parsedMessage.content === lastItemCopied.current) return;

        if (Platform.OS === "android")
          BackgroundModule?.setClipboardText?.(parsedMessage.content);
        else if (Platform.OS === "web")
          windowModule?.setClipboard(parsedMessage.content);
        lastItemCopied.current = parsedMessage.content;
      } catch (error) {
        logError("Error parsing Clipboard WebSocket message:", error);
      }
    };
  }, [clipboardSocketURL, userData?.userId]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (!userData?.userId || lastItemCopied.current) return;
    if (!isLoggedIn) return;

    const initLastItemCopied = async () => {
      const [deviceId, sessionToken] = await Promise.all([
        loadDataSecure("_deviceId"),
        loadDataSecure("_userSessionTokenStorage"),
      ]);
      if (!deviceId || !sessionToken) return;
      lastItemCopied.current = v4();

      const res = await fetchToServer(
        "/database/fetch",
        {
          lang: language,
          limit: 1,
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
      if (isFalsy(data)) return;

      if (data.length === 0 || !data[0]?.content) return;
      lastItemCopied.current = data[0].content;
    };

    const id = setTimeoutPolyfill(initLastItemCopied, 1500);

    return () => clearTimeoutPolyfill(id);
  }, [userData?.userId, isLoggedIn, language]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!isLoggedIn) return;

    const handleIntervalClipboardWeb = async () => {
      if (!userData?.userId) return;

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
        if (!content || lastItemCopied.current === content) return;

        lastItemCopied.current = content;

        sendMessageRef.current("clipboard", {
          type: "add-new-item",
          content,
        });
      } catch (error) {
        logError("Error reading clipboard content", error);
      }
    };

    initIntervalTimeouts("clipboardWeb", {
      fn: handleIntervalClipboardWeb,
      type: "interval",
      interval: 500,
      workWithInternet: true,
      shouldRestartAuto: true,
      shouldStopWhenSuspend: false,
    });

    return () => deleteIntervalTimeout("clipboardWeb");
  }, [
    userData?.userId,
    isLoggedIn,
    initIntervalTimeouts,
    deleteIntervalTimeout,
  ]);

  useEffect(() => {
    if (statePhone !== "suspended") {
      shouldConnect.current.clipboard = true;
      createClipboardWebSocket();
      return;
    }

    shouldConnect.current.clipboard = false;
    isConnectingWs.current.clipboard = false;

    if (clipboardReconnectTimeoutRef.current) {
      clearTimeoutPolyfill(clipboardReconnectTimeoutRef.current);
      clipboardReconnectTimeoutRef.current = null;
    }

    if (clipboardSocketRef.current) {
      clipboardSocketRef.current.close?.();
      clipboardSocketRef.current = null;
    }

    return () => {
      if (!clipboardReconnectTimeoutRef.current) return;

      clearTimeoutPolyfill(clipboardReconnectTimeoutRef.current);
      clipboardReconnectTimeoutRef.current = null;
    };
  }, [t, createClipboardWebSocket, statePhone]);

  useEffect(() => {
    loadData("@webSocketURL").then((data) => setSocketURL(data || null));
    loadData("@clipboardWebSocketURL").then((data) =>
      setClipboardSocketURL(data || null),
    );
  }, []);

  useEffect(() => {
    if (
      socketRef.current &&
      socketRef.current.readyState === WebSocket.OPEN &&
      !isEqual(socketRef.current, socket)
    )
      socketRef.current?.close?.();
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    if (!shouldConnect.current.main) return;

    if (
      !socketRef.current ||
      socketRef.current.readyState === WebSocket.CLOSED
    ) {
      connectionTimeoutId.current = setTimeoutPolyfill(() => {
        createMainWebSocket(socketURL || URL_WEB_SOCKET);
      }, 1500);
    }

    return () => {
      if (!connectionTimeoutId.current) return;

      clearTimeoutPolyfill(connectionTimeoutId.current);
      connectionTimeoutId.current = null;
    };
  }, [socketURL, createMainWebSocket]);

  useEffect(() => {
    if (!isConnected || socketRef.current?.readyState !== WebSocket.OPEN)
      return;

    sendMessageRef.current("main", {
      type: "language-change",
      language,
    });
  }, [language, isConnected]);

  useEffect(() => {
    if (!isBackground) {
      log("App became active");
      shouldConnect.current.main = true;

      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        createMainWebSocket(socketURL || URL_WEB_SOCKET);
      }
      return;
    }

    shouldConnect.current.main = false;

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setSocket(null);
    }

    if (connectionTimeoutId.current) {
      clearTimeoutPolyfill(connectionTimeoutId.current);
      connectionTimeoutId.current = null;
    }

    setIsConnected(false);
    isConnectingWs.current.main = false;
  }, [socketURL, isBackground, createMainWebSocket]);

  return (
    <WebSocketContext.Provider value={{ socket, setSocketURL, sendMessageRef }}>
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
