import {
  Text,
  Card,
  Modal,
  Button,
  Switch,
  Portal,
  ActivityIndicator,
} from "react-native-paper";
import { REPLACERS } from "@common";
import { useLanguage } from "@context/LanguageContext";
import { windowModule } from "@modules";
import { View, Image, ScrollView } from "react-native";
import { useStylesPersonalModeTab } from "@screens/WhatsAppStickers/styles/useStylesPersonalModeTab";
import { useCallback, useEffect, useState } from "react";
import { PersonalStickerConfig, PersonalWhatsAppStatus } from "@types";

export const PersonalModeTab = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesPersonalModeTab();

  const [status, setStatus] = useState<PersonalWhatsAppStatus>({
    state: "disconnected",
  });
  const [config, setConfig] = useState<PersonalStickerConfig>({
    emojis: ["✨"],
    quality: 80,
    packName: "Utilities",
    authorName: "Utilities App",
    allowedChats: "direct_only",
    enabledAutoReply: true,
  });
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleConnect = useCallback(async () => {
    if (!windowModule?.whatsapp) return;
    setIsModalVisible(true);
    setLoading(true);
    try {
      const res = await windowModule.whatsapp.connect();
      setStatus(res);
      if (res.state === "connected") {
        setIsModalVisible(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setIsModalVisible(false);
    if (!windowModule?.whatsapp) return;
    setLoading(true);
    try {
      await windowModule.whatsapp.disconnect();
      setStatus({ state: "disconnected" });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogoutAndPurge = useCallback(async () => {
    setIsModalVisible(false);
    if (!windowModule?.whatsapp) return;
    setLoading(true);
    try {
      await windowModule.whatsapp.logoutAndPurge();
      setStatus({ state: "disconnected" });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleAutoReply = useCallback(async (value: boolean) => {
    if (!windowModule?.whatsapp) return;
    const updated = await windowModule.whatsapp.updateConfig({
      enabledAutoReply: value,
    });
    setConfig(updated);
  }, []);

  useEffect(() => {
    if (!REPLACERS.isWeb || !windowModule?.whatsapp) return;

    windowModule.whatsapp.getStatus().then((initialStatus) => {
      setStatus(initialStatus);

      if (initialStatus.state === "connected") setIsModalVisible(false);
    });

    windowModule.whatsapp.getConfig().then((initialConfig) => {
      setConfig(initialConfig);
    });

    const cleanup = windowModule.whatsapp.onStatusChanged((newStatus) => {
      setStatus(newStatus);
      if (
        newStatus.state === "connected" ||
        newStatus.state === "disconnected"
      ) {
        setIsModalVisible(false);
      }
    });

    return () => {
      cleanup?.();
    };
  }, []);

  if (!REPLACERS.isWeb) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">
              {t("whatsappStickers.personalMode")}
            </Text>
            <Text style={styles.captionText}>
              {t("whatsappStickers.description")}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  const isQrReady = status.state === "qr_ready";
  const isConnected = status.state === "connected";
  const isConnecting = status.state === "connecting" || loading;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Title
          title={t("whatsappStickers.personalMode")}
          subtitle={
            isConnected
              ? t("whatsappStickers.connectedAs", {
                  phoneNumber: status.phoneNumber || "",
                })
              : status.state === "error"
                ? t("whatsappStickers.statusError")
                : isConnecting
                  ? t("whatsappStickers.statusConnecting")
                  : t("whatsappStickers.statusDisconnected")
          }
        />
        <Card.Content>
          <Text style={styles.captionText}>
            {t("whatsappStickers.description")}
          </Text>

          <View style={styles.buttonRow}>
            {!isConnected && !isQrReady && (
              <Button
                mode="contained"
                onPress={handleConnect}
                loading={isConnecting}
                disabled={isConnecting}
              >
                {t("whatsappStickers.connect")}
              </Button>
            )}

            {isConnected && (
              <>
                <Button
                  mode="outlined"
                  onPress={handleDisconnect}
                  style={styles.actionBtn}
                >
                  {t("whatsappStickers.disconnect")}
                </Button>
                <Button
                  mode="text"
                  textColor={colors.error}
                  onPress={handleLogoutAndPurge}
                  style={styles.actionBtn}
                >
                  {t("whatsappStickers.logoutAndPurge")}
                </Button>
              </>
            )}
          </View>

          {isConnected && (
            <View style={styles.switchRow}>
              <Text variant="bodyLarge">
                {t("whatsappStickers.autoReplyEnabled")}
              </Text>
              <Switch
                value={config.enabledAutoReply}
                onValueChange={handleToggleAutoReply}
              />
            </View>
          )}
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={isModalVisible && isQrReady}
          onDismiss={handleDisconnect}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={styles.qrTitle}>
            {t("whatsappStickers.scanQrCode")}
          </Text>
          {status.qrDataUrl ? (
            <Image
              source={{ uri: status.qrDataUrl }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          ) : (
            <ActivityIndicator style={styles.qrLoader} />
          )}
          <Button
            mode="text"
            onPress={handleDisconnect}
            style={styles.cancelBtn}
          >
            {t("whatsappStickers.disconnect")}
          </Button>
        </Modal>
      </Portal>
    </ScrollView>
  );
};
