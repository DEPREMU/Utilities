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
} from "@utils";
import Button from "@components/common/ButtonComponent";
import { useModal } from "./ModalContext";
import windowModule from "@/utils/modules/WindowModule";
import { useLanguage } from "./LanguageContext";
import BackgroundModule from "@/utils/modules/BackgroundModule";
import { useBackground } from "./BackgroundContext";
import { useUserContext } from "./UserContext";
import { useNotifications } from "./NotificationsContext";
import { AppState, Platform } from "react-native";

interface WebSocketContextType {
  socket: WebSocket | null;
  sendMessage: (message: WebSocketMessage) => void;
  setSocketURL: React.Dispatch<React.SetStateAction<string | null>>;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
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
  const { lastItemCopied, sendNotification } = useNotifications();
  const { openSnackBar, openModal, closeModal } = useModal();

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketURL, setSocketURL] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [clipboardSocketURL, setClipboardSocketURL] = useState<string | null>(
    null,
  );

  const socketRef = useRef<WebSocket | null>(null);
  const isConnecting = useRef<boolean>(false);
  const shouldConnect = useRef<boolean>(true);
  const pingIntervalId = useRef<NodeJS.Timeout | number | null>(null);
  const clipboardSocketRef = useRef<WebSocket | null>(null);
  const connectionTimeoutId = useRef<NodeJS.Timeout | number | null>(null);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    const currentSocket = socketRef.current;
    if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) return;
    currentSocket.send(stringifyData(message));
  }, []);

  const createWebSocketConnection = useCallback(
    (url: string) => {
      if (!userData?.userId) return null;
      if (isConnecting.current || !shouldConnect.current) {
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
        clearTimeout(connectionTimeoutId.current);
        connectionTimeoutId.current = null;
      }
      if (pingIntervalId.current) {
        clearInterval(pingIntervalId.current);
        pingIntervalId.current = null;
      }

      log(`Creating WebSocket connection to: ${url}`);
      isConnecting.current = true;

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
        isConnecting.current = false;
        setIsConnected(false);
        if (!pingIntervalId.current) return;

        clearInterval(pingIntervalId.current);
        pingIntervalId.current = null;
      };

      const newSocket = new WebSocket(url);

      newSocket.onopen = async () => {
        log("WebSocket connection opened successfully");
        isConnecting.current = false;
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
            hasAdmin: hasAdmin || false,
          };

          newSocket.send(stringifyData(initMessage));

          if (notifications) {
            const notificationMessage: WebSocketMessage = {
              type: "notifications",
              data: notifications,
              userId: userData?.userId || "",
            };
            newSocket.send(stringifyData(notificationMessage));
          }

          pingIntervalId.current = setInterval(() => {
            if (newSocket.readyState === WebSocket.OPEN) {
              const pingMessage: WebSocketMessage = { type: "ping" };
              newSocket.send(stringifyData(pingMessage));
              log("WebSocket ping sent.");
            }
          }, 29000);
        } catch (error) {
          logError("Error during WebSocket initialization:", error);
        }
      };

      newSocket.onmessage = async (event) => {
        try {
          const parsedMessage: WebSocketResponse = parseData(event.data);
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
              await sendNotification(parsedMessage.notification);
              break;
            case "pong":
              log("WebSocket pong received.");
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
    [openSnackBar, t, userData?.name, userData?.userId, sendNotification],
  );

  useEffect(() => {
    if (!userData?.userId) return;
    if (clipboardSocketRef.current?.readyState === WebSocket.OPEN) return;
    if (clipboardSocketRef.current?.readyState === WebSocket.CONNECTING) return;

    const askRetryConnection = (socket: WebSocket) => {
      const retry = () => {
        clipboardSocketRef.current = null;
        closeModal();
        initWebSocket();
        socket.close();
      };
      if (AppState.currentState !== "active") return retry();

      openModal(
        t("error"),
        t("clipboardWebSocketError"),
        <>
          <Button label={t("close")} handlePress={closeModal} />
          <Button label={t("retry")} handlePress={retry} />
        </>,
      );
    };

    const initWebSocket = async () => {
      log("Initializing Clipboard WebSocket connection...");
      const socket = new WebSocket(clipboardSocketURL || CLIPBOARD_WS_URL);

      socket.onopen = async () => {
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
        socket.send(stringifyData(message));
        log(
          "Clipboard WebSocket connection opened and init message sent.",
          message,
        );
      };

      socket.onerror = (error) => {
        logError("Clipboard WebSocket error:", error);
        askRetryConnection(socket);
      };

      socket.onclose = () => {
        log("Clipboard WebSocket connection closed.");
        askRetryConnection(socket);
      };

      socket.onmessage = (event) => {
        try {
          const parsedMessage = JSON.parse(
            event.data,
          ) as ClipboardWebSocketMessage;

          if (parsedMessage.type !== "new-clipboard-item") return;
          if (parsedMessage.content === lastItemCopied.current) return;

          lastItemCopied.current = parsedMessage.content;
          if (Platform.OS === "android")
            BackgroundModule?.setClipboardText?.(parsedMessage.content);
          else if (Platform.OS === "web")
            windowModule?.setClipboard?.(parsedMessage.content);
        } catch (error) {
          logError("Error parsing Clipboard WebSocket message:", error);
        }
      };
    };

    initWebSocket();
  }, [
    clipboardSocketURL,
    lastItemCopied,
    userData?.userId,
    openModal,
    closeModal,
    t,
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
      socketRef.current !== socket
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
      connectionTimeoutId.current = setTimeout(() => {
        createWebSocketConnection(socketURL || URL_WEB_SOCKET);
      }, 1500);
    }

    return () => {
      if (!connectionTimeoutId.current) return;

      clearTimeout(connectionTimeoutId.current);
      connectionTimeoutId.current = null;
    };
  }, [socketURL, createWebSocketConnection]);

  useEffect(() => {
    if (!isConnected || socketRef.current?.readyState !== WebSocket.OPEN)
      return;

    sendMessage({
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

    if (clipboardSocketRef.current) {
      clipboardSocketRef.current.close?.();
      clipboardSocketRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setSocket(null);
    }

    if (connectionTimeoutId.current) {
      clearTimeout(connectionTimeoutId.current);
      connectionTimeoutId.current = null;
    }

    if (pingIntervalId.current) {
      clearInterval(pingIntervalId.current);
      pingIntervalId.current = null;
    }

    setIsConnected(false);
    isConnecting.current = false;
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
