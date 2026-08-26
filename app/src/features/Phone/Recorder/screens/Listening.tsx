import Animated, {
  FadeInUp,
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import {
  List,
  Text,
  Surface,
  IconButton,
  useTheme as usePaperTheme,
} from "react-native-paper";
import Slider from "@react-native-community/slider";
import { Timers } from "@common";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import { useLanguage } from "@context/LanguageContext";
import { useRecorder } from "@context/RecorderContext";
import { useAppBehavior } from "@context/AppBehaviorContext";
import { StyleSheet, View } from "react-native";
import { Svg, Rect, Circle } from "react-native-svg";
import { createAudioPlayer } from "expo-audio";
import { useStylesRecorderScreen } from "@screens/Phone/Recorder/styles/useStylesRecorderScreen";
import { getFormattedDate } from "@utils";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const formatSeconds = (value?: number | null) => {
  const seconds =
    typeof value === "number" && Number.isFinite(value) && value > 0
      ? value
      : 0;
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes || Number.isNaN(bytes)) return "–";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
};

const formatFileName = (uri: string) => {
  const raw = uri.split("/").pop() || uri;
  const match = raw.match(/(\d{10,})/);
  if (match) {
    const ts = Number(match[1]);
    const date = new Date(ts);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  return raw;
};

const ListeningScreen: React.FC = () => {
  const {
    player,
    dataRecorder,
    statusPlayer,
    actionAudioRef,
    playSelectedAudio,
  } = useRecorder();
  const { t } = useLanguage();
  const paperTheme = usePaperTheme();
  const { colors } = useAppBehavior();
  const { styles } = useStylesRecorderScreen();

  const emptyIllustration = useMemo(
    () => StyleSheet.flatten(styles.emptyIllustration),
    [styles.emptyIllustration],
  );

  const hasAudios = dataRecorder.lastXUris.length > 0;
  const hasSelectedAudio = Boolean(dataRecorder.lastUri);

  const data = useMemo(() => dataRecorder.lastXUris, [dataRecorder.lastXUris]);

  const [metaMap, setMetaMap] = useState<
    Record<
      string,
      {
        sizeLabel: string;
        updatedLabel: string;
        durationLabel: string;
      }
    >
  >({});

  useEffect(() => {
    let isMounted = true;
    const hydrateMeta = async () => {
      const entries = await Promise.all(
        data.map(async (uri) => {
          const info = new FileSystem.File(uri).info();
          const player = createAudioPlayer({ uri });

          while (player.isBuffering) {
            await Timers.sleep(10);
          }

          const duration = player.duration;
          player.remove();

          const updatedLabel = info.modificationTime
            ? getFormattedDate(new Date(info.modificationTime))
            : formatFileName(uri);

          const sizeLabel = formatBytes(info.size);

          const durationLabel = formatSeconds(duration);

          return [uri, { sizeLabel, updatedLabel, durationLabel }] as const;
        }),
      );

      if (isMounted) setMetaMap(Object.fromEntries(entries));
    };

    if (data.length) hydrateMeta();
    else setMetaMap({});

    return () => {
      isMounted = false;
    };
  }, [data]);

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => {
      const fileName = formatFileName(item);
      const isSelected = dataRecorder.lastUri === item;
      const meta = metaMap[item];

      const handlePlay = async () => {
        await Haptics.selectionAsync();
        actionAudioRef.current(item, "select");
        playSelectedAudio();
      };

      const handleDelete = async () => {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
        actionAudioRef.current(item, "delete");
      };

      const handleSave = async () => {
        await Haptics.selectionAsync();
        actionAudioRef.current(item, "save");
      };

      return (
        <Animated.View
          style={styles.contentWidth}
          entering={FadeInDown.delay(index * 40)}
          layout={LinearTransition.springify()}
        >
          <Surface style={styles.listCard} elevation={2}>
            <View style={styles.playerMeta}>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemTitle} numberOfLines={1}>
                  {fileName}
                </Text>
                <Text style={styles.listItemSubtitle} numberOfLines={1}>
                  {meta?.updatedLabel || t("recorder.recordedAudios")}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <Text style={styles.metaText}>
                    {meta?.durationLabel || "-"}
                  </Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaText}>{meta?.sizeLabel || "-"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.listActions}>
              <IconButton
                icon={isSelected && statusPlayer.playing ? "pause" : "play"}
                accessibilityLabel={t("recorder.playSelectedRecording")}
                size={22}
                onPress={handlePlay}
                iconColor={paperTheme.colors.onPrimary}
                containerColor={paperTheme.colors.primary}
                style={styles.listActionButton}
              />
              <IconButton
                icon="delete-outline"
                accessibilityLabel={t("recorder.deleteAudioNumber", {
                  number: String(index + 1),
                })}
                size={22}
                onPress={handleDelete}
                iconColor={colors.text}
                containerColor={colors.background}
                style={styles.listActionButton}
              />
              <IconButton
                icon="download"
                accessibilityLabel={t("recorder.saveAudioNumber", {
                  number: String(index + 1),
                })}
                size={22}
                onPress={handleSave}
                iconColor={colors.text}
                containerColor={colors.accent}
                style={styles.listActionButton}
              />
            </View>
          </Surface>
        </Animated.View>
      );
    },
    [
      t,
      colors,
      styles,
      metaMap,
      actionAudioRef,
      playSelectedAudio,
      paperTheme.colors,
      dataRecorder.lastUri,
      statusPlayer.playing,
    ],
  );

  const currentTimeFormatted = formatSeconds(statusPlayer.currentTime);
  const durationFormatted =
    metaMap[dataRecorder.lastUri || ""]?.durationLabel || "-";

  return (
    <View style={styles.container}>
      <View style={styles.backgroundShapeOne} pointerEvents="none" />
      <View style={styles.backgroundShapeTwo} pointerEvents="none" />
      <Animated.FlatList
        style={styles.containerScrollView}
        contentContainerStyle={[
          styles.contentContainer,
          styles.flatListContent,
        ]}
        data={data}
        keyExtractor={(item) => item}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        ListHeaderComponent={
          <Animated.View
            entering={FadeInUp.duration(220)}
            style={styles.contentWidth}
          >
            <View style={styles.headline}>
              <Text style={styles.title}>{t("recorder.recordedAudios")}</Text>
              <Text style={styles.subtitle}>{t("recorder.label")}</Text>
            </View>

            <List.Section style={styles.section}>
              <List.Subheader style={styles.subheader}>
                {t("recorder.recordedAudios")}
              </List.Subheader>
              {!hasAudios && (
                <View style={styles.emptyState}>
                  <Svg
                    width={(emptyIllustration?.width as number) || 160}
                    height={(emptyIllustration?.height as number) || 100}
                    viewBox="0 0 160 120"
                  >
                    <Rect
                      x="10"
                      y="20"
                      width="120"
                      height="70"
                      rx="12"
                      fill={colors.accent}
                      opacity="0.35"
                    />
                    <Rect
                      x="26"
                      y="34"
                      width="88"
                      height="12"
                      rx="6"
                      fill={colors.primary}
                      opacity="0.65"
                    />
                    <Rect
                      x="26"
                      y="52"
                      width="60"
                      height="10"
                      rx="5"
                      fill={colors.primary}
                      opacity="0.4"
                    />
                    <Circle
                      cx="132"
                      cy="74"
                      r="18"
                      fill={colors.primary}
                      opacity="0.5"
                    />
                  </Svg>
                  <Text style={styles.emptyTitle}>
                    {t("common.notAvailable")}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {t("recorder.recordedAudios")}
                  </Text>
                </View>
              )}
            </List.Section>
          </Animated.View>
        }
        ListFooterComponent={
          hasSelectedAudio ? (
            <Animated.View
              entering={FadeInUp.delay(80)}
              style={[styles.contentWidth, styles.playerCard]}
            >
              <View style={styles.playerMeta}>
                <Text style={styles.listItemTitle} numberOfLines={1}>
                  {formatFileName(dataRecorder.lastUri || "")}
                </Text>
                <Text style={styles.listItemSubtitle}>{durationFormatted}</Text>
              </View>
              <View style={styles.mediaControls}>
                <IconButton
                  icon={statusPlayer.playing ? "pause" : "play"}
                  accessibilityLabel={t("recorder.playSelectedRecording")}
                  size={26}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    playSelectedAudio();
                  }}
                  iconColor={colors.background}
                  containerColor={colors.primary}
                  style={styles.listActionButton}
                />
                <IconButton
                  icon="restart"
                  accessibilityLabel={t("recorder.currentTime", { time: "0" })}
                  size={26}
                  onPress={() => player.seekTo(0)}
                  iconColor={colors.background}
                  containerColor={colors.primary}
                  style={styles.listActionButton}
                />
              </View>
              <View style={styles.containerSlider}>
                <Slider
                  style={styles.slider}
                  maximumValue={statusPlayer.duration || 1}
                  value={statusPlayer.currentTime || 0}
                  disabled={
                    !statusPlayer.isLoaded || statusPlayer.duration === 0
                  }
                  onValueChange={(value) => player.seekTo(value)}
                  minimumTrackTintColor={colors.primary}
                  maximumTrackTintColor={colors.accent}
                  thumbTintColor={colors.primary}
                />
                <View style={styles.playerMeta}>
                  <Text style={styles.timeText}>{currentTimeFormatted}</Text>
                  <Text style={styles.timeText}>{durationFormatted}</Text>
                </View>
              </View>
            </Animated.View>
          ) : null
        }
      />
    </View>
  );
};

export default ListeningScreen;
