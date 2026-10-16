import * as Clipboard from "expo-clipboard";
import { useLanguage } from "@context/LanguageContext";
import { useUserContext } from "@context/UserContext";
import { View } from "react-native";
import { ServerFetch, Timers } from "@common";
import { Card, Text, Button, Chip } from "react-native-paper";
import { useStylesAccountLinkCard } from "@screens/WhatsAppStickers/styles/useStylesAccountLinkCard";
import { useState, useEffect, useRef, useCallback } from "react";
import { WhatsAppQuotaInfo, WhatsAppLinkTokenResult } from "@types";
import { sessionManager, navigation, whatsAppEvents } from "@utils";

const formatCountdown = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export const AccountLinkCard = () => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesAccountLinkCard();

  const { isLoggedIn } = useUserContext();
  const [quota, setQuota] = useState<WhatsAppQuotaInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [tokenResult, setTokenResult] =
    useState<WhatsAppLinkTokenResult | null>(null);

  const copyTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);

  const loadQuota = useCallback(async () => {
    try {
      const { sessionToken } = sessionManager.getSessionData();
      if (!sessionToken) return;

      const res = await ServerFetch.get(
        "/whatsapp/quota",
        undefined,
        sessionToken,
      );

      if (res.data && !("error" in res.data)) setQuota(res.data);
    } catch {
      return;
    }
  }, []);

  const handleGenerateCode = useCallback(async () => {
    const { sessionToken } = sessionManager.getSessionData();
    if (!sessionToken) return;

    setLoading(true);
    try {
      const res = await ServerFetch.post(
        "/whatsapp/link/generate",
        undefined,
        sessionToken,
      );
      if (res.data && !("error" in res.data)) {
        setTokenResult(res.data);
        setRemainingSeconds(res.data.expiresInSeconds);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUnlink = useCallback(async () => {
    const { sessionToken } = sessionManager.getSessionData();
    if (!sessionToken) return;

    setLoading(true);
    try {
      await ServerFetch.delete("/whatsapp/link", undefined, sessionToken);
      setTokenResult(null);
      await loadQuota();
    } finally {
      setLoading(false);
    }
  }, [loadQuota]);

  const handleCopyCode = useCallback(async (code: string) => {
    await Clipboard.setStringAsync(`/link ${code}`);
    if (copyTimerRef.current) Timers.clearTimeout(copyTimerRef.current);

    setCopySuccess(true);
    copyTimerRef.current = Timers.setTimeout(() => {
      setCopySuccess(false);
      copyTimerRef.current = null;
    }, 2000);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    loadQuota();
  }, [isLoggedIn, loadQuota]);

  useEffect(() => {
    const sub = whatsAppEvents.addEventListener(
      "quota-update",
      (updatedQuota) => {
        setQuota(updatedQuota);
        if (updatedQuota.isLinked) {
          setTokenResult(null);
          setRemainingSeconds(0);
        }
      },
    );

    return () => {
      sub.remove();
      if (!copyTimerRef.current) return;

      Timers.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (remainingSeconds > 0) {
      if (countdownTimerRef.current)
        Timers.clearInterval(countdownTimerRef.current);

      countdownTimerRef.current = Timers.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (!countdownTimerRef.current) return 0;

            Timers.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
            setTokenResult(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (!countdownTimerRef.current) return;

      Timers.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    };
  }, [remainingSeconds]);

  if (!isLoggedIn) {
    return (
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            {t("whatsappStickers.generateLinkCode")}
          </Text>
          <Text variant="bodyMedium" style={styles.loginRequiredText}>
            {t("whatsappStickers.loginRequired")}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate("Login")}
            style={styles.loginBtn}
          >
            {t("whatsappStickers.goToLogin")}
          </Button>
        </Card.Content>
      </Card>
    );
  }

  const isInfinite =
    quota?.dailyQuota === -1 ||
    quota?.dailyQuota === null ||
    quota?.remainingToday === -1 ||
    quota?.remainingToday === null;

  const quotaDisplay = isInfinite ? "∞" : (quota?.dailyQuota ?? 0).toString();
  const remainingDisplay = isInfinite
    ? "∞"
    : (quota?.remainingToday ?? 0).toString();

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.cardTitle}>
          {t("whatsappStickers.generateLinkCode")}
        </Text>

        {quota?.isLinked ? (
          <View style={styles.linkedContainer}>
            <Chip icon="check-circle" style={styles.linkedChip}>
              {t("whatsappStickers.connectedAs", {
                phoneNumber: quota.linkedPhoneNumber || "",
              })}
            </Chip>
            <Text variant="bodyMedium" style={styles.quotaText}>
              {t("whatsappStickers.dailyQuotaWithCount", {
                count: quotaDisplay,
              })}
            </Text>
            <Text variant="bodyMedium" style={styles.quotaText}>
              {t("whatsappStickers.remainingQuotaWithCount", {
                count: remainingDisplay,
              })}
            </Text>
            <Button
              mode="outlined"
              style={styles.unlinkButton}
              loading={loading}
              onPress={handleUnlink}
              disabled={loading}
              textColor={colors.error}
            >
              {t("whatsappStickers.unlinkLabel")}
            </Button>
          </View>
        ) : (
          <View style={styles.unlinkedContainer}>
            <Text variant="bodyMedium" style={styles.description}>
              {t("whatsappStickers.description")}
            </Text>

            {tokenResult && remainingSeconds > 0 ? (
              <View style={styles.codeContainer}>
                <Text style={styles.codeDisplay}>{tokenResult.code}</Text>
                <Text variant="bodySmall" style={styles.timerText}>
                  {t("whatsappStickers.quotaResetIn", {
                    time: formatCountdown(remainingSeconds),
                  })}
                </Text>
                <Text variant="bodyMedium" style={styles.instructionText}>
                  {t("whatsappStickers.linkCodeInstructions", {
                    code: tokenResult.code,
                  })}
                </Text>
                <Button
                  mode="contained-tonal"
                  icon={copySuccess ? "check" : "content-copy"}
                  onPress={() => handleCopyCode(tokenResult.code)}
                  style={styles.copyButton}
                >
                  {copySuccess
                    ? t("whatsappStickers.copied")
                    : t("whatsappStickers.copyLinkCommand", {
                        code: tokenResult.code,
                      })}
                </Button>
              </View>
            ) : (
              <Button
                mode="contained"
                style={styles.generateButton}
                loading={loading}
                onPress={handleGenerateCode}
                disabled={loading}
              >
                {t("whatsappStickers.generateLinkCode")}
              </Button>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};
