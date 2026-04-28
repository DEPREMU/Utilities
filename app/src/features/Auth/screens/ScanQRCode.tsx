import {
  ReconnectingWebSocket,
  OptionsReconnectingWS,
} from "@/utils/reconnecting-websocket";
import {
  logger,
  parseData,
  REPLACERS,
  navigation,
  storageManagement,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
  URLS,
} from "@utils";
import Button from "@/common/components/Button/screens";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { useStylesScanQRCode } from "@screens/Auth/styles/useStylesScanQRCode";
import React, { useEffect, useRef, useState } from "react";
import { BarcodeScanningResult, Camera, CameraView } from "expo-camera";
import { LoginWithQRMobile, MessageWebSocketQRLogin } from "@types";

type PermissionCamera = "granted" | "denied" | null;

const optionsWebSocket: OptionsReconnectingWS = {
  startClosed: true,
};

const ScanQRCode: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesScanQRCode();
  const { isLoggedIn } = useUserContext();

  const [scannedData, setScannedData] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<PermissionCamera>(null);

  const idTimeoutRef = useRef<number | null>(null);

  const handleScannedBarcodeRef = useRef((scanned: BarcodeScanningResult) => {
    setScannedData((prev) => {
      if (scanned.data === prev) return prev;

      return scanned.data;
    });
  });

  useEffect(() => {
    const getPermissionsCamera = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted" ? "granted" : "denied");
    };

    getPermissionsCamera();

    return () => clearTimeoutPolyfill(idTimeoutRef);
  }, []);

  useEffect(() => {
    if (hasPermission !== "denied") return;

    modalRef.openModal?.(
      t("noCameraPermission"),
      t("needsCameraPermission"),
      <Button
        label={t("accept")}
        handlePress={() => {
          modalRef.closeModal?.();
          navigation.replace("Home");
        }}
      />,
    );
  }, [hasPermission, t]);

  useEffect(() => {
    if (isLoggedIn && REPLACERS.isNative && !REPLACERS.isDev) return;

    navigation.replace("Home");
  }, [isLoggedIn]);

  useEffect(() => {
    if (!scannedData) return;

    let ws: ReconnectingWebSocket | null = null;

    const clearIdTimeout = () => {
      clearTimeoutPolyfill(idTimeoutRef);
    };

    const handleLoginWithQR = async () => {
      try {
        const parsedMessage: LoginWithQRMobile | null = parseData(scannedData);
        if (!parsedMessage || parsedMessage?.type !== "scanned") return;

        const token = storageManagement.get("USER_SESSION_TOKEN_STORAGE");
        if (!token) {
          logger.error("No session token available for QR login");
          navigation.replace("Home");
          return;
        }

        ws = new ReconnectingWebSocket(URLS.wsLoginQr, optionsWebSocket);

        const handleError = () => {
          setScannedData(null);
          clearIdTimeout();
          modalRef.openModal?.(
            t("qrLoginErrorTitle"),
            t("qrLoginErrorMessage"),
            <Button
              label={t("accept")}
              handlePress={() => {
                modalRef.closeModal?.();
                navigation.replace("Home");
              }}
            />,
          );
          ws?.close();
        };

        ws.onOpen = () => {
          const message: LoginWithQRMobile = {
            ...parsedMessage,
            token,
          };
          ws?.send(JSON.stringify(message));
          idTimeoutRef.current = setTimeoutPolyfill(
            () => {
              logger.error("QR login error: timeout");
              ws?.close();
              navigation.replace("Home");
            },
            1 * 60 * 1000,
          );
        };

        ws.onMessage = (event) => {
          try {
            const message: MessageWebSocketQRLogin<"sentByServer"> | null =
              parseData(event.data.toString());

            if (!message) return ws?.close();

            if (message.type !== "status") return;

            switch (message.status) {
              case "authenticated-web":
                clearIdTimeout();
                modalRef.openModal?.(
                  t("qrLoginSuccessTitle"),
                  t("qrLoginSuccessMessage"),
                  <Button
                    label={t("accept")}
                    handlePress={() => {
                      modalRef.closeModal?.();
                      navigation.replace("Home");
                    }}
                  />,
                );
                break;
              case "error":
                handleError();
                break;
              default:
                break;
            }
            ws?.close();
            navigation.replace("Home");
          } catch (error) {
            logger.error("Error parsing WebSocket message:", error);
          }
        };

        ws.onError = (error) => {
          logger.error("WebSocket error:", error);
          handleError();
        };
      } catch (error) {
        logger.error("Error handling QR login:", error);
      }
    };

    const id = setTimeoutPolyfill(handleLoginWithQR, 500);

    return () => {
      clearIdTimeout();
      clearTimeoutPolyfill(id);
      if (!ws) return;

      ws.close();
      ws = null;
    };
  }, [scannedData, t]);

  return (
    <View style={styles.container}>
      {!hasPermission && (
        <Text style={styles.title}>{t("requestingCameraPermission")}</Text>
      )}
      {hasPermission === "granted" && !scannedData && (
        <>
          <Text style={styles.subtitle}>{t("scanQRCodeInstructions")}</Text>
          <CameraView
            style={styles.cameraView}
            onBarcodeScanned={handleScannedBarcodeRef.current}
          />
        </>
      )}
      {scannedData && <Text style={styles.title}>{t("processingQRCode")}</Text>}
      {hasPermission === "denied" && (
        <Text style={styles.title}>{t("noCameraPermission")}</Text>
      )}
    </View>
  );
};

export default ScanQRCode;
