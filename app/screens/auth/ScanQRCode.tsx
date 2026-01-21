import {
  logError,
  parseData,
  loadDataStorage,
  QR_LOGIN_WS_URL,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import Button from "@components/common/ButtonComponent";
import { Text } from "react-native-paper";
import { useModal } from "@context/ModalContext";
import { useLanguage } from "@context/LanguageContext";
import { Platform, View } from "react-native";
import { useUserContext } from "@context/UserContext";
import { navigateReplace } from "@navigation/navigationRef";
import useStylesScanQRCode from "@/styles/screens/auth/useStylesScanQRCode";
import React, { useEffect, useRef, useState } from "react";
import { BarcodeScanningResult, Camera, CameraView } from "expo-camera";
import { LoginWithQRMobile, MessageWebSocketQRLogin } from "@types";

type PermissionCamera = "granted" | "denied" | null;

const ScanQRCode: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesScanQRCode();
  const { isLoggedIn } = useUserContext();
  const { openModalRef, closeModalRef } = useModal();

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

    openModalRef.current(
      t("noCameraPermission"),
      t("needsCameraPermission"),
      <Button
        label={t("accept")}
        handlePress={() => {
          closeModalRef.current();
          navigateReplace("Home");
        }}
      />,
    );
  }, [hasPermission, t, openModalRef, closeModalRef]);

  useEffect(() => {
    if (isLoggedIn && Platform.OS !== "web") return;

    navigateReplace("Home");
  }, [isLoggedIn]);

  useEffect(() => {
    if (!scannedData) return;

    let ws: WebSocket | null = null;

    const clearIdTimeout = () => {
      clearTimeoutPolyfill(idTimeoutRef);
    };

    const handleLoginWithQR = async () => {
      try {
        const parsedMessage: LoginWithQRMobile | null = parseData(scannedData);
        if (!parsedMessage || parsedMessage?.type !== "scanned") return;

        const token = await loadDataStorage("USER_SESSION_TOKEN_STORAGE");
        if (!token) {
          logError("No session token available for QR login");
          navigateReplace("Home");
          return;
        }

        ws = new WebSocket(QR_LOGIN_WS_URL);

        const handleError = () => {
          setScannedData(null);
          clearIdTimeout();
          openModalRef.current(
            t("qrLoginErrorTitle"),
            t("qrLoginErrorMessage"),
            <Button
              label={t("accept")}
              handlePress={() => {
                closeModalRef.current();
                navigateReplace("Home");
              }}
            />,
          );
          ws?.close();
        };

        ws.onopen = () => {
          const message: LoginWithQRMobile = {
            ...parsedMessage,
            token,
          };
          ws?.send(JSON.stringify(message));
          idTimeoutRef.current = setTimeoutPolyfill(
            () => {
              logError("QR login error: timeout");
              ws?.close();
              navigateReplace("Home");
            },
            1 * 60 * 1000,
          );
        };

        ws.onmessage = (event) => {
          try {
            const message: MessageWebSocketQRLogin<"sentByServer"> | null =
              parseData(event.data);

            if (!message) return ws?.close();

            if (message.type !== "status") return;

            switch (message.status) {
              case "authenticated-web":
                clearIdTimeout();
                openModalRef.current(
                  t("qrLoginSuccessTitle"),
                  t("qrLoginSuccessMessage"),
                  <Button
                    label={t("accept")}
                    handlePress={() => {
                      closeModalRef.current();
                      navigateReplace("Home");
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
            navigateReplace("Home");
          } catch (error) {
            logError("Error parsing WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          logError("WebSocket error:", error);
          handleError();
        };
      } catch (error) {
        logError("Error handling QR login:", error);
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
  }, [scannedData, t, openModalRef, closeModalRef]);

  return (
    <View style={styles.container}>
      {!hasPermission && (
        <Text style={styles.text}>{t("requestingCameraPermission")}</Text>
      )}
      {hasPermission === "granted" && !scannedData && (
        <>
          <Text style={styles.text}>{t("scanQRCodeInstructions")}</Text>
          <CameraView
            style={styles.cameraView}
            onBarcodeScanned={handleScannedBarcodeRef.current}
          />
        </>
      )}
      {scannedData && <Text style={styles.text}>{t("processingQRCode")}</Text>}
      {hasPermission === "denied" && (
        <Text style={styles.text}>{t("noCameraPermission")}</Text>
      )}
    </View>
  );
};

export default ScanQRCode;
