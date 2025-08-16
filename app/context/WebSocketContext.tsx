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
} from "@utils";
import React, {
  useRef,
  useState,
  useEffect,
  useContext,
  createContext,
} from "react";
import {
  UserData,
  typeLanguages,
  WebSocketMessage,
  WebSocketResponse,
} from "@types";
import Button from "@components/common/ButtonComponent";
import { useModal } from "./ModalContext";
import { useLanguage } from "./LanguageContext";
import { useUserContext } from "./UserContext";

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

const handleInitSuccessWebSocket = (
  openModal: (
    title: string,
    body: React.ReactNode,
    buttons: React.ReactNode,
  ) => void,
  closeModal: () => void,
  t: (key: keyof typeLanguages, options?: object) => string,
  userData: UserData | null,
  timeOutId: React.RefObject<NodeJS.Timeout | null>,
) => {
  if (timeOutId.current) clearTimeout(timeOutId.current);
  openModal(
    t("success"),
    t("welcomeUser", { name: userData?.name || t("dearUser") }),
    <Button handlePress={closeModal} label={t("close")} touchableOpacity />,
  );
  log("WebSocket initialized successfully.");
};

const handleReconnectWebSocket = (
  socket: WebSocket,
  timeOutId: React.RefObject<NodeJS.Timeout | null>,
  setSocket: React.Dispatch<React.SetStateAction<WebSocket | null>>,
) => {
  if (socket.readyState === WebSocket.OPEN)
    return timeOutId.current && clearTimeout(timeOutId.current);
  timeOutId.current = setTimeout(() => {
    setSocket(null);
  }, 2000);
};

const getWebSocket = (
  socketURL: string | null,
  userData: UserData | null,
  openModal: (
    title: string,
    body: React.ReactNode,
    buttons: React.ReactNode,
  ) => void,
  closeModal: () => void,
  t: (key: keyof typeLanguages, options?: object) => string,
  timeOutId: React.RefObject<NodeJS.Timeout | null>,
  setSocket: React.Dispatch<React.SetStateAction<WebSocket | null>>,
) => {
  const socket = new WebSocket(socketURL || URL_WEB_SOCKET);
  const pingInterval = setInterval(() => socket.ping(), 30000);

  socket.onopen = () => {
    checkLanguage().then((language) => {
      const message: WebSocketMessage = {
        type: "init",
        uid: userData?.uid || "",
        language,
      };
      socket.send(JSON.stringify(message));
      log("WebSocket message sent:", message);
    });
  };

  socket.onmessage = async (event) => {
    const parsedMessage: WebSocketResponse = JSON.parse(event.data);

    log("Message from server:", parsedMessage);
    if (!parsedMessage.type) {
      logError("Received message without type:", parsedMessage);
      return;
    }
    switch (parsedMessage.type) {
      case "init-success":
        handleInitSuccessWebSocket(
          openModal,
          closeModal,
          t,
          userData,
          timeOutId,
        );
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
      default:
        log("Unknown message type:", parsedMessage);
    }
  };

  socket.onerror = (error) => {
    logError("WebSocket error:", error);
    clearInterval(pingInterval);
    handleReconnectWebSocket(socket, timeOutId, setSocket);
  };

  socket.ping = () => {
    if (socket.readyState !== WebSocket.OPEN)
      return handleReconnectWebSocket(socket, timeOutId, setSocket);
    const message: WebSocketMessage = { type: "ping" };
    socket.send(JSON.stringify(message));
    log("WebSocket ping sent.");
  };

  socket.onclose = (event) => {
    log("WebSocket connection closed:", event);
    clearInterval(pingInterval);
    handleReconnectWebSocket(socket, timeOutId, setSocket);
  };

  return socket;
};

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
}) => {
  const { t } = useLanguage();
  const { userData } = useUserContext();
  const { openModal, closeModal } = useModal();
  const timeOutId = useRef<NodeJS.Timeout | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketURL, setSocketURL] = useState<string | null>(null);

  useEffect(() => {
    loadData<string | null>("@webSocketURL").then(setSocketURL);
  }, []);

  useEffect(() => {
    if ((socket && !socketURL) || !userData) return;
    if (!openModal || !closeModal || !t) return;

    const newSocket = getWebSocket(
      socketURL,
      userData,
      openModal,
      closeModal,
      t,
      timeOutId,
      setSocket,
    );
    setSocket(newSocket);
  }, [socket, openModal, closeModal, t, userData, socketURL]);

  const sendMessage = (message: WebSocketMessage) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(stringifyData(message));
  };

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
