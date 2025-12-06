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
  logError,
  loadData,
  parseData,
  checkLanguage,
  stringifyData,
  URL_WEB_SOCKET,
  loadDataSecure,
  CLIPBOARD_WS_URL,
  getNotifications,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import { isEqual } from "lodash";
import { Platform } from "react-native";
import { useModal } from "./ModalContext";
import windowModule from "@/utils/modules/WindowModule";
import { useLanguage } from "./LanguageContext";
import BackgroundModule from "@/utils/modules/BackgroundModule";
import { useBackground } from "./BackgroundContext";
import { useUserContext } from "./UserContext";
import { useNotifications } from "./NotificationsContext";

type WebSockets = "clipboard" | "main";
interface WebSocketContextType {
  socket: WebSocket | null;
  sendMessage: <T extends WebSockets>(
    ws: T,
    message: T extends "clipboard"
      ? ClipboardWebSocketMessage
      : WebSocketMessage,
  ) => void;
  setSocketURL: React.Dispatch<React.SetStateAction<string | null>>;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

interface IsConnecting {
  main: boolean;
  clipboard: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  sendMessage: () => {},
  setSocketURL: () => {},
});

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { userData } = useUserContext();
  const { t, language } = useLanguage();
  const { isBackground } = useBackground();
  const { lastItemCopied, sendNotificationRef } = useNotifications();
  const { openSnackBar, openModal, closeModal } = useModal();

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketURL, setSocketURL] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [clipboardSocketURL, setClipboardSocketURL] = useState<string | null>(
    null,
  );

  const socketRef = useRef<WebSocket | null>(null);
  const isConnectingWs = useRef<IsConnecting>({
    main: false,
    clipboard: false,
  });
  const shouldConnect = useRef<boolean>(true);
  const clipboardSocketRef = useRef<WebSocket | null>(null);
  const connectionTimeoutId = useRef<NodeJS.Timeout | number | null>(null);
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

  const createWebSocketConnection = useCallback(
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

  useEffect(() => {
    if (!userData?.userId) return;
    if (clipboardSocketRef.current?.readyState === WebSocket.OPEN) return;
    if (clipboardSocketRef.current?.readyState === WebSocket.CONNECTING) return;

    const retryConnection = (socket: WebSocket) => {
      if (isConnectingWs.current.clipboard) return;

      clipboardSocketRef.current = null;
      isConnectingWs.current.clipboard = true;
      try {
        socket.close();
      } catch {
        // Ignore closing errors
      }

      if (clipboardReconnectTimeoutRef.current)
        clearTimeoutPolyfill(clipboardReconnectTimeoutRef.current);

      clipboardReconnectTimeoutRef.current = setTimeoutPolyfill(
        initWebSocket,
        3000,
      );
    };

    const initWebSocket = async () => {
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
    };

    initWebSocket();

    return () => {
      if (!clipboardReconnectTimeoutRef.current) return;

      clearTimeoutPolyfill(clipboardReconnectTimeoutRef.current);
      clipboardReconnectTimeoutRef.current = null;
    };
  }, [
    t,
    openModal,
    closeModal,
    lastItemCopied,
    userData?.userId,
    clipboardSocketURL,
  ]);

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
    if (!shouldConnect.current) return;

    if (
      !socketRef.current ||
      socketRef.current.readyState === WebSocket.CLOSED
    ) {
      connectionTimeoutId.current = setTimeoutPolyfill(() => {
        createWebSocketConnection(socketURL || URL_WEB_SOCKET);
      }, 1500);
    }

    return () => {
      if (!connectionTimeoutId.current) return;

      clearTimeoutPolyfill(connectionTimeoutId.current);
      connectionTimeoutId.current = null;
    };
  }, [socketURL, createWebSocketConnection]);

  useEffect(() => {
    if (!isConnected || socketRef.current?.readyState !== WebSocket.OPEN)
      return;

    sendMessage("main", {
      type: "language-change",
      language,
    });
  }, [language, sendMessage, isConnected]);

  useEffect(() => {
    if (!isBackground) {
      log("App became active");
      shouldConnect.current = true;

      if (
        !socketRef.current ||
        socketRef.current.readyState !== WebSocket.OPEN
      ) {
        createWebSocketConnection(socketURL || URL_WEB_SOCKET);
      }
      return;
    }

    shouldConnect.current = false;

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
  }, [socketURL, createWebSocketConnection, isBackground]);

  return (
    <WebSocketContext.Provider value={{ socket, sendMessage, setSocketURL }}>
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
