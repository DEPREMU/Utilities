import Button from "@/common/components/Button/screens";
import { View } from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import humanizeDuration from "humanize-duration";
import * as Notifications from "expo-notifications";
import { tTyped, REPLACERS } from "@utils";
import useStylesTimeToDownload from "@/features/Calculator/styles/useStylesTimeToDownload";
import { Text, TextInput, List } from "react-native-paper";
import React, { useCallback, useEffect, useRef, useState } from "react";

const SCALE = {
  KB: 1 / 1024,
  MB: 1,
  GB: 1024,
  TB: 1024 * 1024,
} as const;

type ScaleKey = keyof typeof SCALE;

const TimeToDownload = () => {
  const { styles } = useStylesTimeToDownload();
  const { t, language } = useLanguage();

  const [scale, setScale] = useState<ScaleKey>("MB");
  const [timeMS, setTimeMS] = useState<number>(0);
  const [fileSize, setFileSize] = useState<number>(0);
  const [speedMbps, setSpeedMbps] = useState<number>(0);
  const [accordionExpanded, setAccordionExpanded] = useState<boolean>(false);

  const prevIdNotifications = useRef<string | null>(null);

  const handleSelectScaleRef = useRef((value: ScaleKey) => {
    setScale(value);
    setAccordionExpanded(false);
  });

  const handleSetAlarm = useCallback(async () => {
    if (REPLACERS.isWeb) return;
    if (timeMS <= 0) return;

    const alarmTime = Date.now() + timeMS;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: tTyped("timeToDownloadFinished"),
        body: tTyped("timeToDownloadFinishedMessage", {
          time: humanizeDuration(timeMS, { language }),
        }),
        categoryIdentifier: "timeToDownload",
      },
      trigger: {
        date: new Date(alarmTime),
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });
    if (prevIdNotifications.current)
      await Notifications.cancelScheduledNotificationAsync(
        prevIdNotifications.current,
      );

    prevIdNotifications.current = id;
  }, [timeMS, language]);

  useEffect(() => {
    if (!fileSize || !speedMbps) {
      setTimeMS(0);
      return;
    }

    const sizeInMB = fileSize * SCALE[scale];
    const speedMBps = speedMbps / 8;

    const timeSeconds = sizeInMB / speedMBps;
    setTimeMS(timeSeconds * 1000);
  }, [fileSize, speedMbps, scale]);

  const timeText =
    timeMS > 0
      ? humanizeDuration(timeMS, {
          language,
          fallbacks: ["en"],
          round: true,
        })
      : "--";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("timeToDownload")}</Text>

      <TextInput
        label={t("fileSize")}
        keyboardType="numeric"
        value={fileSize ? String(fileSize) : ""}
        onChangeText={(v) => setFileSize(Number(v))}
        style={styles.input}
      />

      <List.Section style={styles.section}>
        <List.Accordion
          title={t("scale", { scale })}
          expanded={accordionExpanded}
          onPress={() => setAccordionExpanded(!accordionExpanded)}
        >
          {Object.keys(SCALE).map((key) => (
            <List.Item
              key={key}
              title={key}
              onPress={() => handleSelectScaleRef.current(key as ScaleKey)}
            />
          ))}
        </List.Accordion>
      </List.Section>

      <TextInput
        label={t("internetSpeedMbps")}
        keyboardType="numeric"
        value={speedMbps ? String(speedMbps) : ""}
        onChangeText={(v) => setSpeedMbps(Number(v))}
        style={styles.input}
      />

      <View style={styles.resultContainer}>
        <Text style={styles.resultLabel}>{t("timeToDownloadResult")}</Text>

        <Text style={styles.resultValue}>{timeText}</Text>
        {timeMS > 0 && REPLACERS.isNative && (
          <Button
            label={t("setAlarmWhenDone", { time: timeText })}
            handlePress={handleSetAlarm}
            touchableOpacity
          />
        )}
      </View>
    </View>
  );
};

export default TimeToDownload;
