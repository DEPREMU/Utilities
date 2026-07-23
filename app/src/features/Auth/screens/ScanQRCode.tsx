import {
  ReconnectingWebSocket,
  OptionsReconnectingWS,
} from "@/utils/reconnecting-websocket";
import { URLS, logger, REPLACERS, navigation, storageManagement } from "@utils";
import Button from "@components/Button/screens";
import { View } from "react-native";
import { Text } from "react-native-paper";
import { Helper, Timers } from "@common";
import { modalRef } from "@refs";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { useStylesScanQRCode } from "@screens/Auth/styles/useStylesScanQRCode";
import React, { useEffect, useRef, useState } from "react";
import { BarcodeScanningResult, Camera, CameraView } from "expo-camera";
import { LoginWithQRMobile, MessageWebSocketQRLogin, Screens } from "@types";

type PermissionCamera = "granted" | "denied" | null;

const optionsWebSocket: OptionsReconnectingWS = {
  startClosed: true,
};

const ScanQRCode: React.FC<Screens["ScanQRCode"]> = () => {
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

    return () => Timers.clearTimeout(idTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (hasPermission !== "denied") return;

    modalRef.openModal?.(
      t("permissions.noCameraPermission"),
      t("permissions.needsCameraPermission"),
      <Button
        label={t("labels.accept")}
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
      Timers.clearTimeout(idTimeoutRef.current);
    };

    const handleLoginWithQR = async () => {
      try {
        const parsedMessage: LoginWithQRMobile | null =
          Helper.JSON.parseData(scannedData);
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
            t("auth.qr.qrLoginErrorTitle"),
            t("auth.qr.qrLoginErrorMessage"),
            <Button
              label={t("labels.accept")}
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
          idTimeoutRef.current = Timers.setTimeout(
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
              Helper.JSON.parseData(event.data.toString());

            if (!message) return ws?.close();

            if (message.type !== "status") return;

            switch (message.status) {
              case "authenticated-web":
                clearIdTimeout();
                modalRef.openModal?.(
                  t("auth.qr.loginSuccessTitle"),
                  t("auth.qr.loginSuccessMessage"),
                  <Button
                    label={t("labels.accept")}
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

    const id = Timers.setTimeout(handleLoginWithQR, 500);

    return () => {
      Timers.clearTimeout(idTimeoutRef.current);
      Timers.clearTimeout(id);
      if (!ws) return;

      ws.close();
      ws = null;
    };
  }, [scannedData, t]);

  return (
    <View style={styles.container}>
      {!hasPermission && (
        <Text style={styles.title}>
          {t("permissions.requestingCameraPermission")}
        </Text>
      )}
      {hasPermission === "granted" && !scannedData && (
        <>
          <Text style={styles.subtitle}>
            {t("auth.qr.scanQRCodeInstructions")}
          </Text>
          <CameraView
            style={styles.cameraView}
            onBarcodeScanned={handleScannedBarcodeRef.current}
          />
        </>
      )}
      {scannedData && (
        <Text style={styles.title}>{t("auth.qr.processingQRCode")}</Text>
      )}
      {hasPermission === "denied" && (
        <Text style={styles.title}>{t("permissions.noCameraPermission")}</Text>
      )}
    </View>
  );
};

export default ScanQRCode;
