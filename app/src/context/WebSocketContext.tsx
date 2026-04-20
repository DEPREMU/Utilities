import {
  ReconnectingWebSocket,
  OptionsReconnectingWS,
} from "@/utils/reconnecting-websocket";
import React, {
  useRef,
  useState,
  useEffect,
  useContext,
  createContext,
} from "react";
import {
  tTyped,
  logger,
  parseData,
  deviceInfo,
  URL_WEB_SOCKET,
  sessionManager,
  EventsDeviceInfo,
  storageManagement,
  notificationsManager,
} from "@utils";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { WebSocketMessage } from "@types";
import { useUserContext } from "./UserContext";

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

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

const OPTIONS_RECONNECT_WS: OptionsReconnectingWS = {
  pingPong: {
    expectedMessage: JSON.stringify({ type: "ping" }),
    expectedResponse: JSON.stringify({ type: "pong" }),
  },
  messagesAfterOpen: [
    () => {
      const lang = storageManagement.get("LANGUAGE");
      const deviceId = storageManagement.get("DEVICE_ID");
      const { userData } = sessionManager.getSessionData();

      const msg: Parameters<SendMessageFunc>[0] = {
        type: "init",
        deviceId,
        userId: userData?.userId || "",
        language: lang || "en",
      };
      return JSON.stringify(msg);
    },
  ],
  startClosed: true,
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { language } = useLanguage();
  const { isLoggedIn } = useUserContext();

  const [socketURL, setSocketURL] = useState<string | null>(null);

  const socketRef = useRef<ReconnectingWebSocket>(
    new ReconnectingWebSocket(URL_WEB_SOCKET, OPTIONS_RECONNECT_WS),
  );

  const sendMessageRef = useRef<SendMessageFunc>(async (message) => {
    const currentSocket = socketRef.current;

    currentSocket.send(JSON.stringify(message));
  });

  useEffect(() => {
    const initialURL = storageManagement.get("WEBSOCKET_URL", null);

    setSocketURL(initialURL);

    const removeListener = deviceInfo.addEventListener(
      EventsDeviceInfo.isBackgroundChange,
      (isBackground) => {
        if (isBackground) {
          socketRef.current.shouldReconnect = false;
        } else {
          socketRef.current.reconnect();
        }
      },
    );
    const sessionListener = sessionManager.addEventListener("login", (err) => {
      if (err) return;

      socketRef.current.reconnect();
    });

    const handleInitSuccessWebSocket = () => {
      const { userData } = sessionManager.getSessionData();
      modalRef.openSnackBar?.(
        tTyped("welcomeUser", { user: userData?.name || tTyped("dearUser") }),
        3000,
        {
          label: tTyped("common.close"),
        },
      );
      logger.log("WebSocket initialized successfully.");
    };

    socketRef.current.onOpen = async () => {
      logger.log("WebSocket connection opened successfully");
    };

    socketRef.current.onMessage = async (event) => {
      try {
        const parsedMessage: WebSocketMessage<"sentByServer"> | null =
          parseData(event.data.toString());
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

    socketRef.current.onError = (error) => {
      logger.error("WebSocket error:", error.message);
    };

    socketRef.current.onClose = (event) => {
      logger.log("WebSocket connection closed:", event.reason, event.code);
    };

    return () => {
      removeListener();
      sessionListener();
    };
  }, []);

  useEffect(() => {
    if (deviceInfo.isBackground) return;

    const { isLoggedIn } = sessionManager.getSessionData();

    const currentSocket = socketRef.current;
    currentSocket.shouldReconnect = isLoggedIn;

    const targetURL = socketURL || URL_WEB_SOCKET;
    currentSocket.url = targetURL;
  }, [socketURL]);

  useEffect(() => {
    if (!socketRef.current.isConnected) return;

    sendMessageRef.current({
      type: "language-change",
      language,
    });
  }, [language]);

  useEffect(() => {
    socketRef.current.shouldReconnect = isLoggedIn;
  }, [isLoggedIn]);

  const valueRef = useRef<WebSocketContextType>({
    setSocketURL,
    sendMessageRef,
  });

  return (
    <WebSocketContext.Provider value={valueRef.current}>
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
