import {
  Card,
  Text,
  Switch,
  Button,
  TextInput,
  SegmentedButtons,
} from "react-native-paper";
import { View } from "react-native";
import { Timers } from "@common";
import { useLanguage } from "@context/LanguageContext";
import { windowModule } from "@modules";
import { PersonalStickerConfig } from "@types";
import { useStylesStickerConfigForm } from "@screens/WhatsAppStickers/styles/useStylesStickerConfigForm";
import { useState, useEffect, useRef, useCallback } from "react";

export const StickerConfigForm = () => {
  const { t } = useLanguage();
  const { styles } = useStylesStickerConfigForm();

  const [config, setConfig] = useState<PersonalStickerConfig>({
    emojis: ["✨"],
    quality: 80,
    packName: "Utilities",
    authorName: "Utilities App",
    autoConnect: false,
    allowedChats: "direct_only",
    enabledAutoReply: true,
  });
  const [saving, setSaving] = useState(false);
  const [packName, setPackName] = useState("Utilities");
  const [authorName, setAuthorName] = useState("Utilities App");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const successTimerRef = useRef<number | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      const updated = await windowModule.whatsapp.updateConfig({
        packName,
        authorName,
      });
      setConfig(updated);

      Timers.clearTimeout(successTimerRef.current);
      successTimerRef.current = Timers.setTimeout(() => {
        setSavedSuccess(false);
        successTimerRef.current = null;
      }, 2000);

      setSavedSuccess(true);
    } finally {
      setSaving(false);
    }
  }, [packName, authorName]);

  const handleToggleAutoReply = useCallback(async (value: boolean) => {
    const updated = await windowModule.whatsapp.updateConfig({
      enabledAutoReply: value,
    });
    setConfig(updated);
  }, []);

  const handleToggleAutoConnect = useCallback(async (value: boolean) => {
    const updated = await windowModule.whatsapp.updateConfig({
      autoConnect: value,
    });
    setConfig(updated);
  }, []);

  const handleAllowedChatsChange = useCallback(
    async (value: "direct_only" | "all") => {
      const allowed = value;
      const updated = await windowModule.whatsapp.updateConfig({
        allowedChats: allowed,
      });
      setConfig(updated);
    },
    [],
  );

  useEffect(() => {
    void windowModule.whatsapp.getConfig().then((loaded) => {
      setConfig(loaded);
      setPackName(loaded.packName);
      setAuthorName(loaded.authorName);
    });

    return () => {
      if (!successTimerRef.current) return;

      Timers.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    };
  }, []);

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.cardTitle}>
          {t("whatsappStickers.title")}
        </Text>

        <View style={styles.switchRow}>
          <Text variant="bodyMedium">
            {t("whatsappStickers.autoReplyEnabled")}
          </Text>
          <Switch
            value={config.enabledAutoReply}
            onValueChange={handleToggleAutoReply}
          />
        </View>

        <View style={styles.switchRow}>
          <Text variant="bodyMedium">
            {t("whatsappStickers.autoConnectEnabled")}
          </Text>
          <Switch
            value={config.autoConnect}
            onValueChange={handleToggleAutoConnect}
          />
        </View>

        <TextInput
          label={t("whatsappStickers.packName")}
          value={packName}
          onChangeText={setPackName}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label={t("whatsappStickers.authorName")}
          value={authorName}
          onChangeText={setAuthorName}
          mode="outlined"
          style={styles.input}
        />

        <View style={styles.segmentedContainer}>
          <Text variant="labelMedium" style={styles.segmentLabel}>
            {t("whatsappStickers.allowedChats")}
          </Text>
          <SegmentedButtons
            value={config.allowedChats}
            onValueChange={handleAllowedChatsChange}
            buttons={[
              {
                value: "direct_only",
                label: t("whatsappStickers.allowedChatsDirect"),
              },
              {
                value: "all",
                label: t("whatsappStickers.allowedChatsAll"),
              },
            ]}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        >
          {savedSuccess
            ? t("whatsappStickers.savedSuccess")
            : t("whatsappStickers.savePreferences")}
        </Button>
      </Card.Content>
    </Card>
  );
};
