import {
  KeyboardGestureArea,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import Animated, {
  FadeOutUp,
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import TextInput from "@components/TextInput";
import { ScrollView } from "react-native";
import { useLanguage } from "@context/LanguageContext";
import humanizeDuration from "humanize-duration";
import * as Notifications from "expo-notifications";
import { useStylesTimeToDownload } from "@screens/Calculator/styles/useStylesTimeToDownload";
import { tTyped, REPLACERS, memoDeep } from "@utils";
import { Text, List, Button, Divider } from "react-native-paper";
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
  const [fileSize, setFileSize] = useState<string>("");
  const [speedMbps, setSpeedMbps] = useState<string>("");
  const [accordionExpanded, setAccordionExpanded] = useState<boolean>(false);

  const prevIdNotifications = useRef<string | null>(null);

  const accordionRef = useRef(
    Object.keys(SCALE).map((key) => (
      <List.Item
        key={key}
        title={key}
        onPress={() => handleSelectScaleRef.current(key as ScaleKey)}
      />
    )),
  );

  const handleSelectScaleRef = useRef((value: ScaleKey) => {
    setScale(value);
    setAccordionExpanded(false);
  });

  const handlePressAccordionRef = useRef(() => {
    setAccordionExpanded((prev) => !prev);
  });

  const handleSetAlarm = useCallback(async () => {
    if (REPLACERS.isWeb) return;
    if (timeMS <= 1000) return;

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
    const fileSizeNum = Number(fileSize);
    const speedMbpsNum = Number(speedMbps);

    if (
      isNaN(fileSizeNum) ||
      isNaN(speedMbpsNum) ||
      fileSizeNum <= 0 ||
      speedMbpsNum <= 0
    ) {
      setTimeMS(0);
      return;
    }

    const sizeInMB = fileSizeNum * SCALE[scale];
    const speedMBps = speedMbpsNum / 8;

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
    <KeyboardGestureArea style={styles.scrollViewContainer} interpolator="ios">
      <KeyboardAvoidingView
        style={styles.scrollViewContainer}
        behavior="padding"
      >
        <ScrollView
          style={styles.scrollViewContainer}
          contentContainerStyle={styles.scrollViewContentContainer}
        >
          <Animated.View
            style={styles.container}
            layout={LinearTransition.duration(200).springify()}
          >
            <Text style={styles.title}>{t("timeToDownload")}</Text>

            <Animated.View
              style={styles.sectionContainer}
              layout={LinearTransition.duration(200).springify()}
            >
              <TextInput
                style={styles.input}
                label={t("fileSize")}
                value={fileSize}
                keyboardType="numeric"
                onChangeText={setFileSize}
              />
            </Animated.View>

            <Divider style={styles.divider} />

            <Animated.View
              style={styles.sectionContainer}
              layout={LinearTransition.duration(200).springify()}
            >
              <List.Accordion
                title={t("scale", { scale })}
                onPress={handlePressAccordionRef.current}
                expanded={accordionExpanded}
              >
                {accordionRef.current}
              </List.Accordion>
            </Animated.View>

            <Animated.View
              style={styles.sectionContainer}
              layout={LinearTransition.duration(200).springify()}
            >
              <TextInput
                style={styles.input}
                label={t("internetSpeedMbps")}
                value={speedMbps}
                keyboardType="numeric"
                onChangeText={setSpeedMbps}
              />
            </Animated.View>

            <Animated.View layout={LinearTransition.duration(200).springify()}>
              <Divider style={styles.divider} />
            </Animated.View>

            <Animated.View
              layout={LinearTransition.duration(200).springify()}
              style={styles.resultContainer}
            >
              <Text style={styles.resultLabel}>
                {t("timeToDownloadResult")}
              </Text>

              <Text style={styles.resultValue} selectable>
                {timeText}
              </Text>

              {timeMS > 1000 && REPLACERS.isNative && (
                <>
                  <Divider style={styles.divider} />

                  <Animated.View
                    exiting={FadeOutUp.duration(200)}
                    entering={FadeInDown.duration(200)}
                  >
                    <Button mode="contained" onPress={handleSetAlarm}>
                      <Text style={styles.h3}>
                        {t("setAlarmWhenDone", { time: timeText })}
                      </Text>
                    </Button>
                  </Animated.View>
                </>
              )}
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </KeyboardGestureArea>
  );
};

export default memoDeep(TimeToDownload);
