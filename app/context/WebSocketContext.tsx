/* eslint-disable indent */
/* eslint-disable no-undef */
import {
  log,
  logError,
  loadData,
  parseData,
  checkLanguage,
  stringifyData,
  URL_WEB_SOCKET,
  sendNotification,
  getNotifications,
} from "@utils";
import React, {
  useRef,
  useState,
  useEffect,
  useContext,
  createContext,
  useCallback,
} from "react";
import { AppState } from "react-native";
import { useModal } from "./ModalContext";
import { useLanguage } from "./LanguageContext";
import { useUserContext } from "./UserContext";
import { Theme, WebSocketMessage, WebSocketResponse } from "@types";

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
  const { openSnackBar } = useModal();

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketURL, setSocketURL] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const connectionTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalId = useRef<NodeJS.Timeout | null>(null);
  const isConnecting = useRef<boolean>(false);
  const shouldConnect = useRef<boolean>(true);
  const socketRef = useRef<WebSocket | null>(null);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    const currentSocket = socketRef.current;
    if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) return;
    currentSocket.send(stringifyData(message));
  }, []);

  const createWebSocketConnection = useCallback(
    (url: string) => {
      if (!userData?.uid) return null;
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

      const newSocket = new WebSocket(url);

      newSocket.onopen = async () => {
        log("WebSocket connection opened successfully");
        isConnecting.current = false;
        setIsConnected(true);

        try {
          const [lang, notifications, hasAdmin, theme] = await Promise.all([
            checkLanguage(),
            getNotifications(),
            loadData<boolean>("@hasAdminAccess"),
            loadData<Theme>("@theme"),
          ]);

          const initMessage: WebSocketMessage = {
            type: "init",
            uid: userData?.uid || "",
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
              uid: userData?.uid || "",
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
              await sendNotification(
                parsedMessage.notification?.reason,
                parsedMessage.notification?.title,
                parsedMessage.notification?.body,
                parsedMessage.notification?.trigger,
                parsedMessage.notification?.screen,
                parsedMessage.notification?.data,
              );
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
        isConnecting.current = false;
        setIsConnected(false);
      };

      newSocket.onclose = (event) => {
        log("WebSocket connection closed:", event);
        isConnecting.current = false;
        setIsConnected(false);

        if (pingIntervalId.current) {
          clearInterval(pingIntervalId.current);
          pingIntervalId.current = null;
        }
      };

      setSocket(newSocket);
    },
    [openSnackBar, t, userData?.name, userData?.uid],
  );

  useEffect(() => {
    loadData<string | null>("@webSocketURL").then(setSocketURL);
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
    const listener = AppState.addEventListener("change", (nextAppState) => {
      log(`AppState changed to: ${nextAppState}`);

      if (nextAppState === "active") {
        log("App became active");
        shouldConnect.current = true;

        if (
          !socketRef.current ||
          socketRef.current.readyState !== WebSocket.OPEN
        ) {
          if (socketURL) {
            createWebSocketConnection(socketURL || URL_WEB_SOCKET);
          }
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
        clearTimeout(connectionTimeoutId.current);
        connectionTimeoutId.current = null;
      }

      if (pingIntervalId.current) {
        clearInterval(pingIntervalId.current);
        pingIntervalId.current = null;
      }

      setIsConnected(false);
      isConnecting.current = false;
    });

    return () => listener.remove();
  }, [socketURL, createWebSocketConnection]);

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
