import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
} from "react";
import {
  tTyped,
  REPLACERS,
  deviceInfo,
  navigation,
  AudioPlayer,
  AudioStatus,
  DataRecorder,
  recorderManager,
  EventsDeviceInfo,
} from "@utils";
import { modalRef } from "@refs";
import { AudioModule } from "expo-audio";

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

export const RecorderProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const player = useMemo(() => recorderManager.getPlayer(), []);

  const [dataRecorder, setDataRecorder] = useState<DataRecorder>(
    recorderManager.getDataRecorder(),
  );
  const [statusMessage, setStatusMessage] = useState<string>(
    recorderManager.getStatusMessage(),
  );
  const [statusPlayer, setStatusPlayer] = useState<AudioStatus>(
    recorderManager.getPlayerStatus(),
  );

  const actionAudioRef: RecorderContextType["actionAudioRef"] = useRef(
    async (uri, action) => {
      await recorderManager.actionAudio(uri, action);
    },
  );

  const editDataRecorderRef: RecorderContextType["editDataRecorderRef"] =
    useRef(async (key, value) => {
      await recorderManager.editDataRecorder(key, value);
    });

  const startRecording = useCallback(async () => {
    await recorderManager.startRecording();
  }, []);

  const stopRecording = useCallback(
    async (options?: { keepService?: boolean }) => {
      await recorderManager.stopRecording(options);
    },
    [],
  );

  const pauseRecording = useCallback(async () => {
    await recorderManager.pauseRecording();
  }, []);

  const playSelectedAudio = useCallback(async () => {
    await recorderManager.playSelectedAudio();
  }, []);

  const handlePressRecord = useCallback(async (pause?: boolean) => {
    await recorderManager.handlePressRecord(pause);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const removeData = recorderManager.addEventListener(
      "data-change",
      (data) => {
        if (!isMounted) return;
        setDataRecorder(data);
      },
    );

    const removeStatus = recorderManager.addEventListener(
      "status-message-change",
      (message) => {
        if (!isMounted) return;
        setStatusMessage(message);
      },
    );

    const removePlayerStatus = recorderManager.addEventListener(
      "player-status-change",
      (status) => {
        if (!isMounted) return;
        setStatusPlayer(status);
      },
    );

    recorderManager.init();

    return () => {
      isMounted = false;
      removeData();
      removeStatus();
      removePlayerStatus();
    };
  }, []);

  useEffect(() => {
    const removeListener = deviceInfo.addEventListener(
      EventsDeviceInfo.screenChange,
      async (_, newScreen) => {
        if (newScreen !== "Recorder") return;

        const permission = await AudioModule.requestRecordingPermissionsAsync();
        if (!permission.granted) {
          modalRef.openSnackBar?.(tTyped("recorder.permissionDenied"));
          navigation.replace("Home");
          return;
        }

        setDataRecorder(recorderManager.getDataRecorder());
        setStatusMessage(recorderManager.getStatusMessage());
        setStatusPlayer(recorderManager.getPlayerStatus());

        await recorderManager.init();
        removeListener();
      },
    );

    return () => removeListener();
  }, []);

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

  if (!context && !REPLACERS.isWeb)
    throw new Error("useRecorder must be used within a RecorderProvider");

  return context || ({} as RecorderContextType);
};
