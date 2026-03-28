import {
  FAB,
  Text,
  Button,
  Surface,
  useTheme as usePaperTheme,
} from "react-native-paper";
import Animated, {
  FadeInDown,
  withRepeat,
  withTiming,
  withSequence,
  useSharedValue,
  cancelAnimation,
  useAnimatedStyle,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { REPLACERS } from "@utils";
import { useRecorder } from "@/context/RecorderContext";
import { useLanguage } from "@/context/LanguageContext";
import humanizeDuration from "humanize-duration";
import useStylesRecorderScreen from "@/features/Phone/Recorder/styles/useStylesRecorderScreen";
import { StyleProp, View, ViewStyle } from "react-native";
import React, { useCallback, useEffect, useMemo } from "react";

const formatDuration = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  const mins = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const RecorderScreen: React.FC = () => {
  const { styles } = useStylesRecorderScreen();
  const { t, language } = useLanguage();
  const { colors: paperColors } = usePaperTheme();
  const { dataRecorder, statusMessage, handlePressRecord } = useRecorder();

  const bars = useMemo(
    () => Array.from({ length: 14 }, (_, index) => index),
    [],
  );

  const recordingText = useMemo(() => {
    if (dataRecorder.isRecording) {
      return t("recorder.recording", {
        seconds: String(dataRecorder.secondsRecorded || 0),
      });
    }
    return t("recorder.stopped");
  }, [dataRecorder.isRecording, dataRecorder.secondsRecorded, t]);

  const secondaryStatus = useMemo(() => {
    if (!statusMessage) return t("recorder.dataLoaded");
    if (statusMessage === recordingText) return t("recorder.dataLoaded");
    return statusMessage;
  }, [recordingText, statusMessage, t]);

  const onPressRecord = useCallback(
    async (pause?: boolean) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      handlePressRecord(pause);
    },
    [handlePressRecord],
  );

  const intervalLabel = useMemo(() => {
    if (dataRecorder.infiniteRecord) return t("recorder.infiniteRecord");

    return humanizeDuration(dataRecorder.intervalOfSaves, {
      language,
      units: ["h", "m", "s"],
      round: true,
    });
  }, [dataRecorder.intervalOfSaves, language, dataRecorder.infiniteRecord, t]);

  return (
    <View style={styles.container}>
      <View style={styles.backgroundShapeOne} pointerEvents="none" />
      <View style={styles.backgroundShapeTwo} pointerEvents="none" />
      <Animated.ScrollView
        entering={FadeInDown}
        style={styles.contentWidth}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.headline}>
          <Text style={styles.title}>{t("recorder.label")}</Text>
          <Text style={styles.subtitle}>{secondaryStatus}</Text>
        </View>

        <Surface style={styles.heroCard} elevation={3}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroTimer}>
              {formatDuration(Number(dataRecorder.secondsRecorded) || 0)}
            </Text>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>
                {dataRecorder.isRecording
                  ? recordingText
                  : t("recorder.stopped")}
              </Text>
            </View>
          </View>

          <View style={styles.waveformContainer}>
            {bars.map((bar) => (
              <WaveBar
                key={`bar-${bar}`}
                active={dataRecorder.isRecording}
                accent={paperColors.primary}
                index={bar}
                barStyle={styles.waveformBar}
              />
            ))}
          </View>

          <View style={styles.actionsRow}>
            <Button
              mode="outlined"
              onPress={() => onPressRecord(false)}
              icon={dataRecorder.isRecording ? "stop-circle" : "record"}
              textColor={paperColors.primary}
              style={styles.outlinedButton}
              contentStyle={styles.outlinedButtonContent}
            >
              {t(
                dataRecorder.isRecording
                  ? "recorder.stopRecording"
                  : "recorder.startRecording",
              )}
            </Button>
            <FAB
              icon={dataRecorder.isRecording ? "pause" : "microphone"}
              onPress={() => onPressRecord(true)}
              style={styles.fab}
              size={REPLACERS.isWeb ? "large" : "medium"}
              color={paperColors.onPrimary}
              mode="flat"
            />
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t("recorder.audioQuality")}</Text>
              <Text style={styles.infoValue}>
                {t(`recorder.${dataRecorder.quality}Description`)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                {t("recorder.intervalOfSaves")}
              </Text>
              <Text style={styles.infoValue}>{intervalLabel}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                {t("recorder.autoStartRecording")}
              </Text>
              <Text style={styles.infoValue}>
                {t(dataRecorder.shouldAutoStart ? "common.yes" : "common.no")}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                {t("recorder.maxFilesToKeep", { maxFiles: "" }).trim()}
              </Text>
              <Text style={styles.infoValue}>{dataRecorder.maxXUris}</Text>
            </View>
          </View>
        </Surface>
      </Animated.ScrollView>
    </View>
  );
};

const WaveBar: React.FC<{
  active: boolean;
  accent: string;
  index: number;
  barStyle: StyleProp<ViewStyle>;
}> = ({ active, accent, index, barStyle }) => {
  const height = useSharedValue(14);

  useEffect(() => {
    if (!active) {
      cancelAnimation(height);
      height.value = withTiming(14, { duration: 180 });
      return;
    }

    height.value = withRepeat(
      withSequence(
        withTiming(20 + (index % 3) * 10 + Math.random() * 12, {
          duration: 320,
        }),
        withTiming(12 + Math.random() * 10, {
          duration: 260,
        }),
      ),
      -1,
      true,
    );

    return () => {
      cancelAnimation(height);
    };
  }, [active, height, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: accent,
  }));

  return <Animated.View style={[barStyle, animatedStyle]} />;
};

export default RecorderScreen;
