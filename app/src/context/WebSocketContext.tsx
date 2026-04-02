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
  deviceInfo,
  waitForTime,
  URL_WEB_SOCKET,
  sessionManager,
  EventsDeviceInfo,
  storageManagement,
  notificationsManager,
} from "@utils";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { WebSocketMessage } from "@types";

type SendMessageFunc = (
  message: WebSocketMessage<"sentByApp">,
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
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

const OPTIONS_RECONNECT_WS: OptionsReconnectingWS = {
  maxRetries: Infinity,
  minReconnectionDelay: 1500,
  maxReconnectionDelay: 10000,
  reconnectionDelayGrowFactor: 1.5,
  connectionTimeout: 5000,
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { language } = useLanguage();

  const [socketURL, setSocketURL] = useState<string | null>(null);

  const socketRef = useRef<ReconnectingWebSocket | null>(null);
  const createMainWebSocketRef = useRef<((url: string) => void) | null>(null);
  const shouldConnectRef = useRef<ShouldConnect>({
    main: true,
  });

  const sendMessageRef = useRef<SendMessageFunc>(async (message) => {
    const currentSocket = socketRef.current;

    if (!currentSocket) {
      logger.error(`Cannot send message to main: Socket is null`);
      return;
    }

    let attempts = 0;
    const maxAttempts = 5;

    while (currentSocket.readyState === WebSocket.CONNECTING) {
      if (attempts >= maxAttempts) {
        logger.error(
          `WebSocket main connection timed out after ${maxAttempts} attempts (still CONNECTING).`,
        );
        return;
      }
      attempts++;
      await waitForTime(1000);
    }

    if (currentSocket.readyState === WebSocket.OPEN) {
      currentSocket.send(JSON.stringify(message));
    } else {
      logger.error(
        `Failed to send message to main: Socket state is ${currentSocket.readyState}`,
      );
    }
  });

  const createMainWebSocket = useCallback((url: string) => {
    const { userData } = sessionManager.getSessionData();

    if (!userData?.userId) return;
    if (!shouldConnectRef.current.main) return;

    socketRef.current?.close();

    const handleInitSuccessWebSocket = () => {
      modalRef.openSnackBar?.(
        tTyped("welcomeUser", { user: userData?.name || tTyped("dearUser") }),
        3000,
        {
          label: tTyped("common.close"),
        },
      );
      logger.log("WebSocket initialized successfully.");
    };

    const newSocket = new ReconnectingWebSocket(url, [], OPTIONS_RECONNECT_WS);

    newSocket.onopen = async () => {
      logger.log("WebSocket connection opened successfully");

      try {
        const [lang, hasAdmin, theme] = [
          storageManagement.get("LANGUAGE"),
          storageManagement.get("HAS_ADMIN_ACCESS"),
          storageManagement.get("THEME"),
        ];

        sendMessageRef.current({
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
            await notificationsManager.sendNotification(
              parsedMessage.notification,
            );
            break;
          case "ping":
            sendMessageRef.current({ type: "pong" });
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
  }, []);
  createMainWebSocketRef.current = createMainWebSocket;

  useEffect(() => {
    setSocketURL(storageManagement.get("WEBSOCKET_URL", null));
  }, []);

  useEffect(() => {
    const removeListener = deviceInfo.addEventListener(
      EventsDeviceInfo.isBackgroundChange,
      (isBackground) => {
        if (isBackground) {
          shouldConnectRef.current.main = false;

          const currentSocket = socketRef.current;
          currentSocket?.close();
          socketRef.current = null;
        } else {
          shouldConnectRef.current.main = true;

          setSocketURL((prev) => {
            createMainWebSocketRef.current?.(prev || URL_WEB_SOCKET);

            return prev;
          });
        }
      },
    );

    return () => removeListener();
  }, []);

  useEffect(() => {
    if (!shouldConnectRef.current.main && deviceInfo.isBackground) return;

    const { userData, isLoggedIn } = sessionManager.getSessionData();
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
  }, [socketURL]);

  useEffect(() => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;

    sendMessageRef.current({
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
