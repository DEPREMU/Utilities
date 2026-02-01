import {
  logger,
  tTyped,
  openURL,
  REPLACERS,
  wrapFunctionWithError,
} from "@utils";
import {
  Point,
  Camera,
  CameraView,
  scanFromURLAsync,
  BarcodeScanningResult,
} from "expo-camera";
import { useModal } from "@context/ModalContext";
import windowModule from "@/utils/modules/WindowModule";
import { Image, View } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import { useStylesQR } from "@styles/screens/QR/useStylesQR";
import AnimatedDrawLine from "@components/common/AnimatedLine";
import * as ExpoClipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { navigateReplace } from "@/navigation/navigationRef";
import { Button, Divider, Text } from "react-native-paper";
import React, { useEffect, useRef, useState } from "react";

type Corner = Point & {
  x2: number;
  y2: number;
};

type ScanningType = "camera" | "image";

const ScanQR = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesQR();
  const { openSnackBarRef } = useModal();

  const [corners, setCorners] = useState<
    [Corner, Corner, Corner, Corner] | null
  >(null);

  const [result, setResult] = useState<BarcodeScanningResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [uriFile, setUriFile] = useState<string | null>(null);
  const [scanningType, setScanningType] = useState<ScanningType>(
    REPLACERS.isWeb ? "camera" : "image",
  );

  const cameraRef = React.useRef<CameraView>(null);

  const setClipboardTextRef = useRef(async (text: string) => {
    try {
      await ExpoClipboard.setStringAsync(text);
    } catch {
      if (REPLACERS.isWeb) windowModule.setClipboard(text);
    }
  });

  const freezeCameraRef = useRef(async () => {
    try {
      if (!cameraRef.current) return;

      await cameraRef.current.pausePreview();
    } catch (error) {
      logger.error(
        "SCAN_QR",
        "Error pausing camera preview",
        (error as Error).message,
      );
    }
  });

  const handleBarcodeScannedRef = useRef((result: BarcodeScanningResult) => {
    freezeCameraRef.current();

    setResult(result);
    const cornerTopLeft = result.cornerPoints?.[0];
    const cornerTopRight = result.cornerPoints?.[1];
    const cornerBottomLeft = result.cornerPoints?.[3];
    const cornerBottomRight = result.cornerPoints?.[2];

    setCorners([
      {
        x: cornerTopLeft?.x ?? 0,
        y: cornerTopLeft?.y ?? 0,
        x2: cornerTopRight?.x ?? 0,
        y2: cornerTopRight?.y ?? 0,
      },
      {
        x: cornerBottomRight?.x ?? 0,
        y: cornerBottomRight?.y ?? 0,
        x2: cornerTopRight?.x ?? 0,
        y2: cornerTopRight?.y ?? 0,
      },
      {
        x: cornerBottomLeft?.x ?? 0,
        y: cornerBottomLeft?.y ?? 0,
        x2: cornerBottomRight?.x ?? 0,
        y2: cornerBottomRight?.y ?? 0,
      },
      {
        x: cornerTopLeft?.x ?? 0,
        y: cornerTopLeft?.y ?? 0,
        x2: cornerBottomLeft?.x ?? 0,
        y2: cornerBottomLeft?.y ?? 0,
      },
    ]);
  });

  const handlePressResetCameraRef = useRef(async () => {
    try {
      if (!cameraRef.current) return;

      await cameraRef.current.resumePreview();
      setResult(null);
      setCorners(null);
    } catch (error) {
      logger.error(
        "SCAN_QR",
        "Error resuming camera preview",
        (error as Error).message,
      );
    }
  });

  const handlePressSelectImageRef = useRef(async () => {
    if (REPLACERS.isWeb) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setUriFile(uri);
      const [qrData] = await scanFromURLAsync(uri);
      setResult(qrData ?? null);
    } catch (error) {
      logger.error(
        "SCAN_QR",
        "Error scanning image for QR scan",
        (error as Error).message,
      );
    }
  });

  useEffect(() => {
    if (scanningType !== "camera") return;

    wrapFunctionWithError(
      async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (status === "granted") setLoading(false);
        else {
          openSnackBarRef.current(tTyped("noCameraPermission"));
          navigateReplace("QR");
        }
      },
      async (_, errMsg) => {
        logger.error("SCAN_QR", "Error requesting camera permissions", errMsg);
      },
    );
  }, [scanningType, openSnackBarRef]);

  return (
    <View style={styles.container}>
      <View style={styles.containerButtons}>
        <Button
          mode="contained"
          onPress={() => setScanningType("camera")}
          style={styles.button}
        >
          {t("scanQRCode")}
        </Button>
        {!REPLACERS.isWeb && (
          <Button
            mode="contained"
            onPress={() => setScanningType("image")}
            style={styles.button}
          >
            {t("QR.scanFromImage")}
          </Button>
        )}
      </View>

      {scanningType === "camera" && !loading && (
        <View style={styles.containerCamera}>
          {corners &&
            corners.map((corner, index) => (
              <AnimatedDrawLine
                key={index}
                x1={corner.x}
                y1={corner.y}
                x2={corner.x2}
                y2={corner.y2}
                duration={1000}
              />
            ))}

          <CameraView
            ref={cameraRef}
            style={styles.cameraView}
            onBarcodeScanned={handleBarcodeScannedRef.current}
          />

          <Button
            mode="contained"
            onPress={handlePressResetCameraRef.current}
            style={styles.button}
          >
            {t("QR.resetCamera")}
          </Button>
        </View>
      )}
      {!REPLACERS.isWeb && scanningType === "image" && (
        <View style={styles.container}>
          <Button mode="contained" onPress={handlePressSelectImageRef.current}>
            {t("QR.selectImage")}
          </Button>
          {uriFile && (
            <Image source={{ uri: uriFile }} style={styles.imageQR} />
          )}
        </View>
      )}

      <Divider style={styles.divider} />

      {!!result?.data && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle} selectable>
            {result.data}
          </Text>
          <Button
            mode="outlined"
            style={styles.button}
            textColor={colors.text}
            onPress={() => setClipboardTextRef.current(result.data ?? "")}
          >
            {t("addTextToClipboard")}
          </Button>
        </View>
      )}
      {result?.extra?.type === "url" && (
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => openURL(result.data ?? "")}
        >
          {t("openURL")}
        </Button>
      )}
      {result?.extra?.type === "email" && (
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => openURL(`mailto:${result.data}`)}
        >
          {t("common.openEmail")}
        </Button>
      )}
      {result?.extra?.type === "phone" && (
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => openURL(`tel:${result.data}`)}
        >
          {t("common.callPhone")}
        </Button>
      )}
      {result?.extra?.type === "geoPoint" && (
        <Button
          mode="contained"
          style={styles.button}
          onPress={() => openURL(`geo:${result.data}`)}
        >
          {t("common.openMap")}
        </Button>
      )}
    </View>
  );
};

export default ScanQR;
