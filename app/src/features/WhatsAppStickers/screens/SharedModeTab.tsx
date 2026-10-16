import { WA_LINK } from "@utils";
import { ServerFetch } from "@common";
import { useLanguage } from "@context/LanguageContext";
import { AccountLinkCard } from "@screens/WhatsAppStickers/components/AccountLinkCard";
import { WhatsAppHealthStatus } from "@types";
import { useStylesSharedModeTab } from "@screens/WhatsAppStickers/styles/useStylesSharedModeTab";
import { Card, Text, Button, Chip } from "react-native-paper";
import { View, ScrollView, Linking } from "react-native";
import { useState, useEffect, useCallback } from "react";

export const SharedModeTab = () => {
  const { t } = useLanguage();
  const { styles } = useStylesSharedModeTab();

  const [health, setHealth] = useState<WhatsAppHealthStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const healthRes = await ServerFetch.get("/whatsapp/health");

      if (healthRes?.data && !("error" in healthRes.data))
        setHealth(healthRes.data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpenWhatsApp = useCallback(() => {
    void Linking.openURL(WA_LINK);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOperational = health?.status === "healthy";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text variant="titleLarge" style={styles.title}>
              {t("whatsappStickers.sharedMode")}
            </Text>
            <Chip
              icon={isOperational ? "check-circle" : "alert-circle"}
              style={[
                styles.statusChip,
                isOperational
                  ? styles.statusChipOperational
                  : styles.statusChipMaintenance,
              ]}
              textStyle={
                isOperational
                  ? styles.statusTextOperational
                  : styles.statusTextMaintenance
              }
            >
              {isOperational
                ? t("whatsappStickers.serviceAvailable")
                : t("whatsappStickers.serviceMaintenance")}
            </Chip>
          </View>

          <Text variant="bodyMedium" style={styles.overviewText}>
            {t("whatsappStickers.description")}
          </Text>

          <View style={styles.actionRow}>
            <Button
              icon="whatsapp"
              mode="contained"
              style={styles.chatButton}
              onPress={handleOpenWhatsApp}
              textColor="#FFFFFF"
              buttonColor="#25D366"
            >
              {t("whatsappStickers.openInWhatsApp")}
            </Button>
            <Button
              mode="text"
              icon="refresh"
              loading={loading}
              onPress={loadData}
            >
              {t("whatsappStickers.refresh")}
            </Button>
          </View>
        </Card.Content>
      </Card>

      <AccountLinkCard />
    </ScrollView>
  );
};
