/* eslint-disable indent */
/* eslint-disable no-undef */
import {
  log,
  logError,
  stringifyData,
  URL_WEB_SOCKET,
  sendNotification,
  loadData,
  checkLanguage,
  getNotifications,
  parseData,
} from "@utils";
import React, {
  useRef,
  useState,
  useEffect,
  useContext,
  createContext,
  useCallback,
} from "react";
import Button from "@components/common/ButtonComponent";
import { useModal } from "./ModalContext";
import { useLanguage } from "./LanguageContext";
import { useUserContext } from "./UserContext";
import { WebSocketMessage, WebSocketResponse } from "@types";

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
  const { t, language } = useLanguage();
  const { userData } = useUserContext();
  const { openModal, closeModal } = useModal();
  const timeOutId = useRef<NodeJS.Timeout | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketURL, setSocketURL] = useState<string | null>(null);

  const sendMessage = useCallback(
    (message: WebSocketMessage) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      socket.send(stringifyData(message));
    },
    [socket],
  );

  const handleInitSuccessWebSocket = useCallback(async () => {
    if (timeOutId.current) clearTimeout(timeOutId.current);
    openModal(
      t("success"),
      t("welcomeUser", { user: userData?.name || t("dearUser") }),
      <Button handlePress={closeModal} label={t("close")} touchableOpacity />,
    );
    log("WebSocket initialized successfully.");
  }, [closeModal, openModal, t, userData?.name]);

  const getWebSocket = useCallback(() => {
    if (
      socket &&
      socket.readyState === WebSocket.OPEN &&
      (!socketURL || (socketURL && socketURL === socket.url))
    )
      return socket;
    socket?.close();

    const localSocket = new WebSocket(socketURL || URL_WEB_SOCKET);

    localSocket.onopen = () => {
      checkLanguage().then((language) => {
        getNotifications().then((notifications) => {
          let message: WebSocketMessage = {
            type: "init",
            uid: userData?.uid || "",
            notifications,
            language,
          };
          localSocket.send(stringifyData(message));
          if (!notifications) return;
          message = {
            type: "notifications",
            data: notifications,
            uid: userData?.uid || "",
          };
          localSocket.send(stringifyData(message));
        });
      });
    };

    localSocket.onmessage = async (event) => {
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
      }
    };

    localSocket.onerror = (error) => {
      logError("WebSocket error:", error);
    };

    localSocket.ping = () => {
      if (!localSocket || localSocket.readyState !== WebSocket.OPEN) return;
      const message: WebSocketMessage = { type: "ping" };
      localSocket.send(JSON.stringify(message));
      log("WebSocket ping sent.");
    };

    localSocket.onclose = (event) => {
      log("WebSocket connection closed:", event);
    };

    return localSocket;
  }, [socketURL, userData, handleInitSuccessWebSocket, socket]);

  useEffect(() => {
    loadData<string | null>("@webSocketURL").then(setSocketURL);
  }, []);

  useEffect(() => {
    if (socket) return;

    const id = setTimeout(() => {
      const newSocket = getWebSocket();
      setSocket(newSocket);
    }, 2000);

    return () => clearTimeout(id);
  }, [socket, getWebSocket]);

  useEffect(() => {
    if (!socket) return;

    const checkSocketListener = () => setSocket(null);
    socket.addEventListener("close", checkSocketListener);

    const pingInterval = setInterval(() => socket.ping(), 30000);

    return () => {
      clearInterval(pingInterval);
      socket.removeEventListener("close", checkSocketListener);
    };
  }, [socket, socketURL, getWebSocket]);

  useEffect(() => {
    if (
      !socketURL ||
      (socket?.url === socketURL && WebSocket.OPEN === socket?.readyState)
    )
      return;

    socket?.close?.();
  }, [socketURL, socket]);

  useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const message: WebSocketMessage = {
      type: "language-change",
      language,
    };
    socket.send(stringifyData(message));
  }, [language, socket]);

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
