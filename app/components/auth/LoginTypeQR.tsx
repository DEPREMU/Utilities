import {
  log,
  logError,
  parseData,
  clearRefs,
  loadDataStorage,
  QR_LOGIN_WS_URL,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import { Text } from "react-native-paper";
import { Image, View } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import useStylesAuthScreens from "@styles/screens/auth/useStylesAuthScreens";
import { MessageWebSocketQRLogin } from "@types";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface LoginTypeQRProps {
  handleChangeTypeLogin: () => void;
  rememberMe: boolean;
}

const LoginTypeQR: React.FC<LoginTypeQRProps> = ({
  rememberMe,
  handleChangeTypeLogin,
}) => {
  const { t } = useLanguage();
  const { styles } = useStylesAuthScreens();
  const { loginWithQRRef } = useUserContext();

  const [qrData, setQRData] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [retryAttempt, setRetryAttempt] = useState<number>(0);

  const isValidQRRef = useRef<boolean | null>(false);

  const handleLoginWithQR = useCallback(() => {
    log("Initializing WebSocket connection for QR login", QR_LOGIN_WS_URL);

    let ws: WebSocket | null = null;

    const handleClose = () => {
      log("Closing QR login WebSocket connection");
      ws?.close();
      ws = null;
      isValidQRRef.current = false;
    };

    const handleError = (message: string) => {
      setRetryAttempt(retryAttempt + 1);
      logError(message);
      handleChangeTypeLogin();
      handleClose();
    };

    const initWS = async () => {
      const deviceId = await loadDataStorage("_deviceId");

      ws = new WebSocket(QR_LOGIN_WS_URL);

      ws.onopen = () => {
        const message: MessageWebSocketQRLogin<"sentByApp"> = {
          type: "init-web",
          deviceId,
          rememberMe,
        };
        ws?.send(JSON.stringify(message));
      };

      ws.onmessage = (event: MessageEvent) => {
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
              loginWithQRRef.current(message.response);
              break;
            default:
              break;
          }
        } catch (error) {
          logError("Error parsing WebSocket message for QR login", error);
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
      if (!ws) return;

      ws.close();
      ws = null;
    };
  }, [rememberMe, handleChangeTypeLogin, loginWithQRRef, retryAttempt]);

  useEffect(() => handleLoginWithQR(), [handleLoginWithQR]);

  // Cleanup refs on unmount
  useEffect(() => () => clearRefs(isValidQRRef), []);

  return (
    <View style={styles.containerQR}>
      <Text style={styles.textQR}>{t("scanQRCode")}</Text>
      {qrData && isValidQRRef.current && (
        <View style={styles.qrCodeContainer}>
          <Image source={{ uri: qrData }} style={styles.qrCodeImage} />
          {isLoggingIn && (
            <Text style={styles.textQR}>{t("loggingInWithQRCode")}</Text>
          )}
        </View>
      )}
      {!qrData && <Text style={styles.textQR}>{t("generatingQRCode")}</Text>}
    </View>
  );
};

export default LoginTypeQR;
