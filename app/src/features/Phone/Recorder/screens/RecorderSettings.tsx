import {
  Text,
  Menu,
  Button,
  Switch,
  Surface,
  TextInput,
  IconButton,
  Divider,
} from "react-native-paper";
import { View } from "react-native";
import * as Haptics from "expo-haptics";
import { useRecorder } from "@context/RecorderContext";
import { useLanguage } from "@context/LanguageContext";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useStylesRecorderScreen } from "@screens/Phone/Recorder/styles/useStylesRecorderScreen";
import React, { useCallback, useMemo, useRef, useState } from "react";

const qualities = ["low", "medium", "high", "lossless"] as const;
const typesTime = ["millis", "seconds", "minutes", "hours"] as const;

const convertToExpectedTime = (
  prev: (typeof typesTime)[number],
  interval: number,
  expected: (typeof typesTime)[number],
) => {
  let newInterval = interval;

  switch (prev) {
    case "hours":
      newInterval *= 3600000;
      break;
    case "minutes":
      newInterval *= 60000;
      break;
    case "seconds":
      newInterval *= 1000;
      break;

    default:
      break;
  }

  switch (expected) {
    case "hours":
      newInterval /= 3600000;
      break;
    case "minutes":
      newInterval /= 60000;
      break;
    case "seconds":
      newInterval /= 1000;
      break;

    default:
      break;
  }

  return newInterval;
};

const RecorderSettings: React.FC = () => {
  const { t } = useLanguage();
  const { styles } = useStylesRecorderScreen();
  const { dataRecorder, editDataRecorderRef } = useRecorder();

  const preferredUnit = useMemo<(typeof typesTime)[number]>(() => {
    const interval = dataRecorder.intervalOfSaves;
    if (interval % 3600000 === 0) return "hours";
    if (interval % 60000 === 0) return "minutes";
    if (interval % 1000 === 0) return "seconds";
    return "millis";
  }, [dataRecorder.intervalOfSaves]);

  const [menus, setMenus] = useState<{
    quality: boolean;
    interval: boolean;
  }>({
    quality: false,
    interval: false,
  });
  const [typeTimeRendered, setTypeTimeRendered] =
    useState<(typeof typesTime)[number]>(preferredUnit);
  const [timeInterval, setTimeInterval] = useState<string>(
    String(
      convertToExpectedTime(
        "millis",
        dataRecorder.intervalOfSaves,
        preferredUnit,
      ),
    ),
  );
  const [maxFiles, setMaxFiles] = useState<number>(dataRecorder.maxXUris);

  const intervalDisplay = useMemo(
    () => `${timeInterval || 0} ${t(`times.${typeTimeRendered}`)}`,
    [t, timeInterval, typeTimeRendered],
  );

  const qualitiesRendered = useMemo(
    () =>
      qualities.map((quality) => (
        <Menu.Item
          key={quality}
          onPress={async () => {
            await Haptics.selectionAsync();
            editDataRecorderRef.current("quality", quality);
            setMenus((prev) => ({ ...prev, quality: false }));
          }}
          title={t(`recorder.${quality}Description`)}
        />
      )),
    [editDataRecorderRef, t],
  );

  const typesTimeRendered = useMemo(
    () =>
      typesTime.map((type) => (
        <Menu.Item
          key={type}
          onPress={async () => {
            await Haptics.selectionAsync();
            setTypeTimeRendered((prevType) => {
              setTimeInterval((prevInterval) =>
                String(
                  convertToExpectedTime(
                    prevType,
                    Number(prevInterval.replace(/[^0-9.]/g, "")),
                    type,
                  ),
                ),
              );
              return type;
            });
            setMenus((prev) => ({ ...prev, interval: false }));
          }}
          title={t(`times.${type}`)}
        />
      )),
    [t],
  );

  const applyInterval = useCallback(() => {
    const parsed = Number(timeInterval.replace(/[^0-9.]/g, ""));
    const safe = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    const millis = convertToExpectedTime(typeTimeRendered, safe, "millis");
    Haptics.selectionAsync();
    editDataRecorderRef.current("intervalOfSaves", millis);
  }, [editDataRecorderRef, timeInterval, typeTimeRendered]);

  const adjustMaxFilesRef = useRef((delta: number) => {
    Haptics.selectionAsync();
    setMaxFiles((prev) => {
      const next = Math.max(1, prev + delta);
      editDataRecorderRef.current("maxXUris", next);
      return next;
    });
  });

  return (
    <View style={styles.container}>
      <View style={styles.backgroundShapeOne} pointerEvents="none" />
      <View style={styles.backgroundShapeTwo} pointerEvents="none" />
      <Animated.ScrollView
        style={styles.containerScrollView}
        entering={FadeInDown}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.contentWidth}>
          <View style={styles.headline}>
            <Text style={styles.title}>{t("common.settings")}</Text>
            <Text style={styles.subtitle}>{t("recorder.label")}</Text>
          </View>

          <Surface style={styles.sectionCard} elevation={2}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t("recorder.audioQuality")}
              </Text>
            </View>
            <Menu
              visible={menus.quality}
              onDismiss={() =>
                setMenus((prev) => ({ ...prev, quality: false }))
              }
              anchorPosition="bottom"
              anchor={
                <Button
                  mode="outlined"
                  onPress={() =>
                    setMenus((prev) => ({ ...prev, quality: !prev.quality }))
                  }
                  style={styles.menuAnchor}
                >
                  {t(`recorder.${dataRecorder.quality}Description`)}
                </Button>
              }
            >
              {qualitiesRendered}
            </Menu>
          </Surface>

          <Surface style={styles.sectionCard} elevation={2}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t("recorder.autoStartRecording")}
              </Text>
              <Switch
                value={dataRecorder.shouldAutoStart}
                onValueChange={async (value) => {
                  await Haptics.selectionAsync();
                  editDataRecorderRef.current("shouldAutoStart", value);
                }}
                style={styles.switch}
              />
            </View>
            <Divider />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t("recorder.intervalOfSaves")}
              </Text>
              <Menu
                visible={menus.interval}
                onDismiss={() =>
                  setMenus((prev) => ({ ...prev, interval: false }))
                }
                anchorPosition="bottom"
                anchor={
                  <Button
                    mode="outlined"
                    onPress={() =>
                      setMenus((prev) => ({
                        ...prev,
                        interval: !prev.interval,
                      }))
                    }
                    style={styles.menuAnchor}
                  >
                    {intervalDisplay}
                  </Button>
                }
              >
                {typesTimeRendered}
              </Menu>
            </View>
            <View style={styles.inlineFieldRow}>
              <TextInput
                mode="outlined"
                keyboardType="numeric"
                value={String(timeInterval)}
                onChangeText={(text) =>
                  setTimeInterval(text.replace(/[^0-9.]/g, ""))
                }
                onEndEditing={applyInterval}
                style={[styles.input, styles.inputStretch]}
                placeholder={t("recorder.intervalOfSaves")}
              />
            </View>
          </Surface>

          <Surface style={styles.sectionCard} elevation={2}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t("recorder.maxFilesToKeep", { maxFiles: String(maxFiles) })}
              </Text>
            </View>
            <View style={styles.stepper}>
              <IconButton
                icon="minus"
                size={22}
                onPress={() => adjustMaxFilesRef.current(-1)}
                style={styles.listActionButton}
              />
              <View style={styles.stepperValue}>
                <Text style={styles.stepperValueText}>{maxFiles}</Text>
              </View>
              <IconButton
                icon="plus"
                size={22}
                onPress={() => adjustMaxFilesRef.current(1)}
                style={styles.listActionButton}
              />
            </View>
          </Surface>

          <Surface style={styles.sectionCard} elevation={2}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t("recorder.infiniteRecord")}
              </Text>
              <Switch
                onValueChange={async (value) => {
                  await Haptics.selectionAsync();
                  editDataRecorderRef.current("infiniteRecord", value);
                }}
                value={dataRecorder.infiniteRecord}
                style={styles.switch}
              />
            </View>
          </Surface>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

export default RecorderSettings;
