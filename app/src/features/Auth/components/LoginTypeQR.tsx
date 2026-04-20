import {
  logger,
  parseData,
  QR_LOGIN_WS_URL,
  storageManagement,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import { Text } from "react-native-paper";
import { Image, View } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { useStylesAuthScreens } from "@screens/Auth/styles/useStylesAuthScreens";
import { MessageWebSocketQRLogin } from "@types";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface LoginTypeQRProps {
  rememberMe: boolean;
}

const TAG = "LoginTypeQR";

const LoginTypeQR: React.FC<LoginTypeQRProps> = ({ rememberMe }) => {
  const { t } = useLanguage();
  const { styles } = useStylesAuthScreens();
  const { dataRef } = useUserContext();

  const [qrData, setQRData] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [retryAttempt, setRetryAttempt] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const isValidQRRef = useRef<boolean | null>(false);

  const handleCloseWebSocketRef = useRef((reason?: "timeout" | "error") => {
    if (!wsRef.current) return;

    logger.log(
      TAG,
      "Closing QR login WebSocket connection with reason:",
      reason,
    );
    wsRef.current.close();
    wsRef.current = null;
    isValidQRRef.current = false;
  });

  const handleLoginWithQR = useCallback(() => {
    logger.log(
      TAG,
      "Initializing WebSocket connection for QR login",
      QR_LOGIN_WS_URL,
    );

    const handleError = (message: string) => {
      setRetryAttempt(retryAttempt + 1);
      handleLoginWithQR();
      logger.error(message);
      handleCloseWebSocketRef.current();
    };

    const initWS = async () => {
      const deviceId = storageManagement.get("DEVICE_ID");

      wsRef.current = new WebSocket(QR_LOGIN_WS_URL);

      wsRef.current.onopen = () => {
        const message: MessageWebSocketQRLogin<"sentByApp"> = {
          type: "init-web",
          deviceId,
          rememberMe,
        };
        wsRef.current?.send(JSON.stringify(message));
      };

      wsRef.current.onmessage = (event: MessageEvent) => {
        try {
          const message: MessageWebSocketQRLogin<"sentByServer"> | null =
            parseData(event.data);
          if (!message)
            return handleError("Invalid message received" + event.data);

          if (message.type !== "status") {
            setQRData(message.dataURL);
            isValidQRRef.current = true;
            return;
          }

          switch (message.status) {
            case "waiting":
              setIsLoggingIn(true);
              break;
            case "error":
            case "timeout":
              handleError(message.status);
              break;
            case "authenticated":
              dataRef.current.loginWithQR(message.response);
              break;
            default:
              break;
          }
        } catch (error) {
          logger.error("Error parsing WebSocket message for QR login", error);
          handleError(
            "Error parsing WebSocket message for QR login" +
              (error instanceof Error ? ": " + error.message : String(error)),
          );
        }
      };
    };

    const id = setTimeoutPolyfill(initWS, 500);

    return () => {
      clearTimeoutPolyfill(id);

      handleCloseWebSocketRef.current();
    };
  }, [rememberMe, dataRef, retryAttempt]);

  useEffect(() => handleLoginWithQR(), [handleLoginWithQR]);

  return (
    <>
      <Text style={styles.subtitle}>{t("scanQRCode")}</Text>
      {qrData && isValidQRRef.current && (
        <View style={styles.qrCodeContainer}>
          <Image source={{ uri: qrData }} style={styles.qrCodeImage} />
          {isLoggingIn && (
            <Text style={styles.subtitle}>{t("loggingInWithQRCode")}</Text>
          )}
        </View>
      )}
      {!qrData && <Text style={styles.subtitle}>{t("generatingQRCode")}</Text>}
    </>
  );
};

export default LoginTypeQR;
