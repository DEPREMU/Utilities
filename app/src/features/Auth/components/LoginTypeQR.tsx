import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
} from "react-native-reanimated";
import { REPLACERS } from "@common";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { useStylesAuthScreens } from "@screens/Auth/styles/useStylesAuthScreens";
import { ReconnectingWebSocket } from "@/utils/reconnecting-websocket";
import { MessageWebSocketQRLogin } from "@types";
import { URLS, storageManagement } from "@utils";
import React, { useEffect, useRef, useState } from "react";

interface LoginTypeQRProps {
  rememberMe: boolean;
}

const TAG = "LoginTypeQR";

const LoginTypeQR: React.FC<LoginTypeQRProps> = ({ rememberMe }) => {
  const { t } = useLanguage();
  const { styles } = useStylesAuthScreens();
  const { dataRef } = useUserContext();

  const [qrData, setQRData] = useState<string | null>(null);
  const [isValidQR, setIsValidQR] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const wsRef =
    useRef<ReconnectingWebSocket<MessageWebSocketQRLogin<"sentByApp">>>(
      undefined,
    );

  const handleCloseWebSocketRef = useRef((reason?: "timeout" | "error") => {
    if (!wsRef.current) return;

    REPLACERS.Logger.log(
      TAG,
      "Closing QR login WebSocket connection with reason:",
      reason,
    );
    wsRef.current.close();
    setIsValidQR(false);
  });

  useEffect(() => {
    const deviceId = storageManagement.get("DEVICE_ID");

    const handleError = (message: string) => {
      REPLACERS.Logger.error(message);
      handleCloseWebSocketRef.current();
      wsRef.current?.reconnect();
    };

    wsRef.current = new ReconnectingWebSocket<
      MessageWebSocketQRLogin<"sentByApp">
    >(URLS.wsLoginQr);

    wsRef.current.onOpen = () => {
      wsRef.current?.send({
        type: "init-web",
        deviceId,
        rememberMe: true,
      });
    };

    wsRef.current.onMessage = (event) => {
      try {
        const message: MessageWebSocketQRLogin<"sentByServer"> = JSON.parse(
          event.data.toString(),
        );
        if (!message)
          return handleError("Invalid message received" + event.data);

        if (message.type !== "status") {
          setQRData(message.dataURL);
          setIsValidQR(true);
          return;
        }

        switch (message.status) {
          case "authenticating":
            setIsLoggingIn(true);
            break;
          case "error":
            handleError(message.status);
            break;
          case "authenticated":
            dataRef.current.loginWithQR(message.response);
            break;
          default:
            break;
        }
      } catch (error) {
        REPLACERS.Logger.error(
          "Error parsing WebSocket message for QR login",
          error,
        );
        handleError(
          "Error parsing WebSocket message for QR login" +
            (error instanceof Error ? ": " + error.message : String(error)),
        );
      }
    };

    const reconnect = () => {
      wsRef.current?.reconnect();
    };

    wsRef.current.onError = reconnect;
    wsRef.current.onClose = reconnect;
  }, [dataRef]);

  useEffect(() => {
    if (!wsRef.current) return;

    setIsValidQR(false);
    wsRef.current.send({
      type: "remember-me",
      rememberMe,
    });
  }, [rememberMe]);

  useEffect(() => () => handleCloseWebSocketRef.current("timeout"), []);

  return (
    <Animated.View
      style={styles.loginTypeContainer}
      layout={LinearTransition.duration(300).springify()}
      exiting={FadeOutLeft.duration(200)}
      entering={FadeInRight.duration(200)}
    >
      <Animated.Text style={styles.subtitle}>
        {t("auth.qr.scanQRCode")}
      </Animated.Text>

      <Animated.View
        style={styles.qrCodeContainer}
        layout={LinearTransition.duration(200).springify()}
      >
        {qrData && isValidQR ? (
          <Animated.Image
            style={styles.qrCodeImage}
            source={{ uri: qrData }}
            exiting={FadeOutRight.duration(200)}
            entering={FadeInLeft.duration(200)}
          />
        ) : (
          <Animated.View
            style={styles.qrCodeImage}
            layout={LinearTransition.duration(200).springify()}
            exiting={FadeOutRight.duration(200)}
            entering={FadeInLeft.duration(200)}
          />
        )}

        {isLoggingIn && (
          <Animated.Text style={styles.subtitle}>
            {t("auth.qr.loggingInWithQRCode")}
          </Animated.Text>
        )}
      </Animated.View>

      {!qrData && (
        <Animated.Text style={styles.subtitle}>
          {t("auth.qr.generatingQRCode")}
        </Animated.Text>
      )}
    </Animated.View>
  );
};

export default LoginTypeQR;
