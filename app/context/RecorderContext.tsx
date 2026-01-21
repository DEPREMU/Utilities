import React, {
  useRef,
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
  useMemo,
} from "react";
import {
  AudioModule,
  AudioPlayer,
  AudioStatus,
  useAudioPlayer,
  RecordingPresets,
  useAudioRecorder,
  useAudioPlayerStatus,
  useAudioRecorderState,
} from "expo-audio";
import {
  tTyped,
  logError,
  areEqualValues,
  downloadBase64,
  loadDataStorage,
  saveDataStorage,
  wrapFunctionWithError,
  ExpectedUnsecureStorageTypes,
  setTimeoutPolyfill,
} from "@utils";
import { Platform } from "react-native";
import { useModal } from "./ModalContext";
import { useNotifications } from "./NotificationsContext";
import { NotificationAction } from "@types";
import { Directory, File, Paths } from "expo-file-system";

interface RecorderContextType {
  player: AudioPlayer;
  actionAudioRef: React.RefObject<
    (uri: string, action: "delete" | "select" | "save") => void
  >;
  statusPlayer: AudioStatus;
  dataRecorder: DataRecorder;
  statusMessage: string;
  stopRecording: (options?: { keepService?: boolean }) => void;
  editDataRecorderRef: React.RefObject<
    <T extends keyof DataRecorder | "infiniteRecord">(
      key: T,
      value: T extends keyof DataRecorder ? DataRecorder[T] : boolean,
    ) => void
  >;
  startRecording: () => void;
  handlePressRecord: (pause?: boolean) => void;
  playSelectedAudio: () => void;
  pauseRecording: () => void;
}

const RecorderContext = createContext<RecorderContextType | undefined>(
  undefined,
);

type RecorderData = Exclude<
  ExpectedUnsecureStorageTypes["RECORDER_DATA"],
  null
>;

type DataRecorder = RecorderData;

const intervalUpdateRecord = 500;
let firstTimeInit = true;
let prevDataRecorder: DataRecorder | null = null;

export const RecorderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { openSnackBarRef } = useModal();
  const { sendNotificationRef } = useNotifications();

  const [dataRecorder, setDataRecorder] = useState<DataRecorder>({
    lastUri: "",
    quality: "high",
    maxXUris: 10,
    lastXUris: [],
    isRecording: false,
    infiniteRecord: false,
    secondsRecorded: 0,
    shouldAutoStart: false,
    intervalOfSaves: 60000,
  });
  const [statusMessage, setStatusMessage] = useState<string>("");

  const player = useAudioPlayer({ uri: dataRecorder.lastUri || undefined });
  const statusPlayer = useAudioPlayerStatus(player);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(
    audioRecorder,
    intervalUpdateRecord,
  );

  const isStoppingRef = useRef<boolean>(false);
  const audioRecorderRef = useRef(audioRecorder);
  const recorderStateRef = useRef(recorderState);
  const startRecordingRef = useRef(() => {});
  recorderStateRef.current = recorderState;
  useEffect(() => {
    if (dataRecorder.isRecording) return;

    audioRecorderRef.current = audioRecorder;
  }, [audioRecorder, dataRecorder.isRecording]);

  const startRecording = useCallback(
    async () =>
      await wrapFunctionWithError(
        async () => {
          const forDuration = dataRecorder.infiniteRecord
            ? undefined
            : (dataRecorder.intervalOfSaves + intervalUpdateRecord) / 1000;

          await wrapFunctionWithError(async () => {
            await audioRecorderRef.current.prepareToRecordAsync();
          });
          audioRecorderRef.current.record({
            forDuration,
          });

          setDataRecorder((prev) => ({
            ...prev,
            isRecording: true,
            secondsRecorded: 0,
          }));
        },
        async (_, errorMsg) => {
          logError("RECORDER", "Error starting recording:", errorMsg);
          openSnackBarRef.current(
            tTyped("recorder.failedToInitialize", { message: errorMsg }),
          );
        },
      ),
    [
      openSnackBarRef,
      dataRecorder.intervalOfSaves,
      dataRecorder.infiniteRecord,
    ],
  );

  const stopRecording = useCallback(async () => {
    try {
      if (!dataRecorder.isRecording || isStoppingRef.current) return;
      isStoppingRef.current = true;

      await audioRecorderRef.current.stop();
      let uri = audioRecorderRef.current.uri as string;

      uri = await wrapFunctionWithError(
        async () => {
          if (!uri) return uri;

          const file = new File(uri);
          const directory = new Directory(Paths.cache, "recordings");
          directory.create({
            intermediates: true,
            idempotent: true,
          });
          const filename = `recording_${Date.now()}${file.extension || ".wav"}`;

          const newFile = new File(directory, filename);

          file.move(newFile);

          return newFile.uri;
        },
        async (_, errorMsg) => {
          logError("RECORDER", "Error moving recording file:", errorMsg);
          return uri;
        },
      );

      setDataRecorder((prev) => {
        const updatedLastXUris = [...prev.lastXUris, uri];
        while (updatedLastXUris.length > prev.maxXUris) {
          const first = updatedLastXUris.shift();
          if (first) {
            wrapFunctionWithError(async () => {
              new File(first).delete();
            });
          }
        }

        return {
          ...prev,
          lastUri: uri || prev.lastUri,
          lastXUris: updatedLastXUris,
          isRecording: false,
          secondsRecorded: 0,
        };
      });
      openSnackBarRef.current(tTyped("recorder.saved", { uri }), 5000);
      setStatusMessage(tTyped("recorder.stopped"));
    } catch (error) {
      openSnackBarRef.current(
        tTyped("recorder.failedToStop", {
          message: (error as Error).message,
        }),
      );
      logError("RECORDER", "Error stopping recording:", error);
    } finally {
      isStoppingRef.current = false;
    }
  }, [openSnackBarRef, dataRecorder.isRecording]);

  const pauseRecording = useCallback(async () => {
    if (!dataRecorder.isRecording) return;

    audioRecorderRef.current.pause();
    setDataRecorder((prev) => ({
      ...prev,
      isRecording: false,
    }));
  }, [dataRecorder.isRecording]);

  const playSelectedAudio = useCallback(async () => {
    const isPlaying = player.playing;
    if (isPlaying) {
      player.pause();
      return;
    }

    if (player.currentTime >= player.duration) await player.seekTo(0);
    player.play();
  }, [player]);

  const actionAudioRef: RecorderContextType["actionAudioRef"] = useRef(
    async (uri, action) => {
      switch (action) {
        case "select":
          setDataRecorder((prev) => ({ ...prev, lastUri: uri }));
          break;
        case "delete":
          setDataRecorder((prev) => {
            const updatedLastXUris = prev.lastXUris.filter(
              (item) => item !== uri,
            );
            return {
              ...prev,
              lastXUris: updatedLastXUris,
              lastUri: updatedLastXUris[updatedLastXUris.length - 1] || "",
            };
          });
          wrapFunctionWithError(async () => {
            new File(uri).delete();
          });
          break;
        case "save":
          {
            const file = new File(uri);
            const base64 = await file.base64();

            const filename = `recording_${Date.now()}${file.extension || ".wav"}`;

            await downloadBase64({
              directory: "audios",
              uri: base64,
              fileName: filename,
              typeFile: `audio/${(file.extension.replace(".", "") as "wav") || "wav"}`,
            });
          }
          break;
        default:
          break;
      }
    },
  );

  const handlePressRecord = useCallback(
    (pause?: boolean) => {
      if (dataRecorder.isRecording)
        if (pause) pauseRecording();
        else stopRecording();
      else startRecording();
    },
    [dataRecorder.isRecording, stopRecording, startRecording, pauseRecording],
  );

  const editDataRecorderRef: RecorderContextType["editDataRecorderRef"] =
    useRef(async (key, value) => {
      if (key === "shouldAutoStart") {
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          openSnackBarRef.current(tTyped("recorder.permissionDenied"));
          return;
        }
      }
      setDataRecorder((prev) => ({
        ...prev,
        [key]: value,
      }));
    });

  useEffect(() => {
    startRecordingRef.current = () => stopRecording().then(startRecording);
  }, [startRecording, stopRecording]);

  useEffect(() => {
    if (!firstTimeInit) return;

    const loadData = async () => {
      const data = await loadDataStorage("RECORDER_DATA", null);
      if (!data) return;
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted)
        openSnackBarRef.current(tTyped("recorder.permissionDenied"));
      else
        await AudioModule.setAudioModeAsync({
          shouldPlayInBackground: true,
          allowsBackgroundRecording: true,
        });

      setDataRecorder((prev) => {
        const actions: NotificationAction[] = [
          { actionId: "stop", title: tTyped("recorder.stopRecording") },
        ];

        if (data.shouldAutoStart && permission.granted) {
          setTimeoutPolyfill(() => {
            startRecordingRef.current();
          }, 1000);

          sendNotificationRef.current?.({
            channelId: "recorderNotification",
            title: tTyped("recorder.autoStartedTitle"),
            message: tTyped("recorder.autoStartedNotification"),
            reasonNotification: "recorderNotification",
            overrideNotification: true,
            type: "info",
            actions,
          });
        } else if (data.shouldAutoStart && !permission.granted) {
          sendNotificationRef.current?.({
            channelId: "recorderNotification",
            title: tTyped("recorder.autoStartedFailedTitle"),
            message: tTyped("recorder.autoStartedFailedNotification"),
            reasonNotification: "recorderNotification",
            overrideNotification: true,
            type: "warning",
            actions,
          });
        }

        return { ...prev, ...data };
      });
      firstTimeInit = false;
      setStatusMessage(tTyped("recorder.dataLoaded"));
    };

    loadData();
  }, [sendNotificationRef, openSnackBarRef]);

  useEffect(() => {
    const partialMain: Partial<DataRecorder> = { ...dataRecorder };
    const partialPrev: Partial<DataRecorder> = { ...(prevDataRecorder || {}) };
    delete partialMain.isRecording;
    delete partialPrev.isRecording;
    delete partialMain.secondsRecorded;
    delete partialPrev.secondsRecorded;

    if (areEqualValues(true, partialMain, partialPrev)) return;
    prevDataRecorder = dataRecorder;

    saveDataStorage("RECORDER_DATA", dataRecorder);
  }, [dataRecorder]);

  useEffect(() => {
    if (!dataRecorder.isRecording) return;

    const editSecDataRecorder = (newSec: number) => {
      setDataRecorder((prev) => {
        newSec = newSec > prev.secondsRecorded ? newSec : prev.secondsRecorded;

        setStatusMessage(
          tTyped("recorder.recording", { seconds: String(newSec) }),
        );

        return {
          ...prev,
          secondsRecorded: newSec,
        };
      });
    };

    const newSec = Math.floor(recorderStateRef.current.durationMillis / 1000);

    editSecDataRecorder(newSec);
    if (newSec * 1000 >= dataRecorder.intervalOfSaves)
      startRecordingRef.current();
  }, [
    dataRecorder.intervalOfSaves,
    dataRecorder.isRecording,
    recorderState.durationMillis,
  ]);

  const value: RecorderContextType = useMemo(
    () => ({
      player,
      dataRecorder,
      statusPlayer,
      statusMessage,
      stopRecording,
      actionAudioRef,
      pauseRecording,
      startRecording,
      playSelectedAudio,
      handlePressRecord,
      editDataRecorderRef,
    }),
    [
      player,
      dataRecorder,
      statusPlayer,
      statusMessage,
      stopRecording,
      pauseRecording,
      startRecording,
      playSelectedAudio,
      handlePressRecord,
    ],
  );

  return (
    <RecorderContext.Provider value={value}>
      {children}
    </RecorderContext.Provider>
  );
};

export const useRecorder = (): RecorderContextType => {
  const context = useContext(RecorderContext);

  if (!context && Platform.OS !== "web")
    throw new Error("useRecorder must be used within a RecorderProvider");

  return context || ({} as RecorderContextType);
};
