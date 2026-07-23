import {
  Timers,
  ServiceClass,
  wrapFunctionWithError,
  ExpectedUnsecureStorageTypes,
} from "@common";
import {
  FileFormat,
  FilePreset,
  AudioManager,
  AudioContext,
  AudioRecorder,
  FileDirectory,
  RecordingNotificationManager,
} from "react-native-audio-api";
import { tTyped } from "../translates";
import { modalRef } from "@refs";
import { storageManagement } from "./storage";
import { NotificationAction } from "@types";
import { notificationsManager } from "./notifications";
import { Directory, File, Paths } from "expo-file-system";
import { logger, areEqualValues, downloadBase64 } from "../functions";

type RecorderData = Exclude<
  ExpectedUnsecureStorageTypes["RECORDER_DATA"],
  null
>;
export type DataRecorder = RecorderData;

type RecorderAction = "delete" | "select" | "save";

export type AudioStatus = {
  isLoaded: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
};

export type AudioPlayer = {
  currentStatus: AudioStatus;
  playing: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  replace: (source: { uri: string }) => void;
  play: () => Promise<void>;
  pause: () => void;
  seekTo: (seconds: number) => Promise<void>;
  remove: () => void;
};

type ListenersRecorder = {
  "data-change": (data: DataRecorder) => void;
  "player-status-change": (status: AudioStatus) => void;
  "status-message-change": (message: string) => void;
};

type EditDataRecorder = <T extends keyof DataRecorder | "infiniteRecord">(
  key: T,
  value: T extends keyof DataRecorder ? DataRecorder[T] : boolean,
) => Promise<void>;

const TAG = "RECORDER";

const INTERVAL_UPDATE_RECORD = 500;
const INTERVAL_UPDATE_PLAYER = 250;

const getRecordingPreset = (quality: DataRecorder["quality"]) =>
  quality === "low" ? FilePreset.Low : FilePreset.High;

const createAudioPlayer = ({ uri = "" }: { uri?: string }): AudioPlayer => {
  const context = new AudioContext();
  let source: ReturnType<AudioContext["createBufferSource"]> | null = null;
  let audioBuffer: Awaited<ReturnType<AudioContext["decodeAudioData"]>> | null =
    null;
  let currentUri = "";
  let currentTime = 0;
  let startAt = 0;
  let playing = false;
  let isBuffering = false;
  let disposed = false;
  let requestId = 0;

  const getDuration = () => audioBuffer?.duration || 0;

  const getLiveCurrentTime = () => {
    if (!playing) return Math.min(currentTime, getDuration());
    const elapsed = context.currentTime - startAt;
    return Math.min(getDuration(), Math.max(0, currentTime + elapsed));
  };

  const stopSource = () => {
    const currentSource = source;
    if (!currentSource) return;

    source = null;
    playing = false;

    wrapFunctionWithError(async () => {
      currentSource.stop();
      currentSource.disconnect();
    });
  };

  const preload = async (uriToLoad: string, id: number) => {
    if (!uriToLoad || disposed) {
      audioBuffer = null;
      isBuffering = false;
      return;
    }

    isBuffering = true;

    try {
      const decoded = await context.decodeAudioData(uriToLoad);
      if (disposed || id !== requestId || currentUri !== uriToLoad) return;
      audioBuffer = decoded;
    } catch (error) {
      if (!disposed)
        logger.error(
          "RECORDER",
          "Error loading audio buffer:",
          error instanceof Error ? error.message : String(error),
        );
      if (id === requestId) audioBuffer = null;
    } finally {
      if (!disposed && id === requestId) isBuffering = false;
    }
  };

  const ensureLoaded = async () => {
    if (!currentUri) return false;
    if (audioBuffer) return true;

    const id = ++requestId;
    await preload(currentUri, id);
    return Boolean(audioBuffer);
  };

  const startPlaybackFrom = async (offset: number) => {
    if (!audioBuffer || disposed) return;

    await context.resume();

    const nextSource = context.createBufferSource();
    nextSource.buffer = audioBuffer;
    nextSource.connect(context.destination);

    source = nextSource;
    startAt = context.currentTime;
    playing = true;

    nextSource.onEnded = () => {
      if (source !== nextSource) return;

      source = null;
      playing = false;
      currentTime = getDuration();
    };

    nextSource.start(0, Math.max(0, Math.min(offset, getDuration())));
  };

  const player: AudioPlayer = {
    get currentStatus() {
      return {
        isLoaded: Boolean(audioBuffer),
        playing,
        currentTime: getLiveCurrentTime(),
        duration: getDuration(),
        isBuffering,
      };
    },
    get playing() {
      return playing;
    },
    get currentTime() {
      return getLiveCurrentTime();
    },
    get duration() {
      return getDuration();
    },
    get isBuffering() {
      return isBuffering;
    },
    replace: (nextSource) => {
      stopSource();
      currentUri = nextSource.uri || "";
      currentTime = 0;
      audioBuffer = null;
      requestId += 1;

      if (!currentUri) return;
      void preload(currentUri, requestId);
    },
    play: async () => {
      const loaded = await ensureLoaded();
      if (!loaded || !audioBuffer) return;

      if (getLiveCurrentTime() >= getDuration()) currentTime = 0;

      stopSource();
      await startPlaybackFrom(currentTime);
    },
    pause: () => {
      if (!playing) return;
      currentTime = getLiveCurrentTime();
      stopSource();
    },
    seekTo: async (seconds) => {
      const clamped = Math.max(0, Math.min(seconds, getDuration()));
      const shouldContinue = playing;

      if (shouldContinue) {
        currentTime = getLiveCurrentTime();
        stopSource();
      }

      currentTime = clamped;

      if (shouldContinue) await startPlaybackFrom(currentTime);
    },
    remove: () => {
      if (disposed) return;
      disposed = true;
      stopSource();
      audioBuffer = null;
      currentUri = "";
      currentTime = 0;
      isBuffering = false;

      wrapFunctionWithError(async () => {
        await context.close();
      });
    },
  };

  player.replace({ uri });
  return player;
};

const getPersistedData = (data: DataRecorder) => {
  return {
    lastUri: data.lastUri,
    quality: data.quality,
    maxXUris: data.maxXUris,
    lastXUris: data.lastXUris,
    infiniteRecord: data.infiniteRecord,
    intervalOfSaves: data.intervalOfSaves,
    shouldAutoStart: data.shouldAutoStart,
  };
};

const getDefaultData = (): DataRecorder => ({
  lastUri: "",
  quality: "high",
  isRecording: false,
  secondsRecorded: 0,
  maxXUris: 5,
  lastXUris: [],
  infiniteRecord: false,
  intervalOfSaves: 60000,
  shouldAutoStart: false,
});

class RecorderManager extends ServiceClass<ListenersRecorder> {
  #data: DataRecorder;
  #statusMessage = "";

  #audioRecorder: AudioRecorder | null = null;
  #player: AudioPlayer;
  #statusPlayer: AudioStatus;

  #recordIntervalId: number | null = null;
  #playerIntervalId: number | null = null;
  #notificationPauseSubscription: { remove: () => void } | null = null;
  #notificationResumeSubscription: { remove: () => void } | null = null;
  #isStopping = false;
  #prevPersistedData: DataRecorder | null = null;

  private bindRecordingNotificationEvents = () => {
    if (
      this.#notificationPauseSubscription ||
      this.#notificationResumeSubscription
    )
      return;

    this.#notificationPauseSubscription =
      RecordingNotificationManager.addEventListener(
        "recordingNotificationPause",
        () => {
          this.pauseRecording();
        },
      );

    this.#notificationResumeSubscription =
      RecordingNotificationManager.addEventListener(
        "recordingNotificationResume",
        () => {
          this.startRecording();
        },
      );
  };

  private updateRecordingNotification = async (paused: boolean = false) => {
    await RecordingNotificationManager.show({
      paused,
      title: tTyped("recorder.label"),
      contentText: paused
        ? tTyped("recorder.stopped")
        : tTyped("recorder.recording", {
            seconds: String(this.#data.secondsRecorded || 0),
          }),
    });
  };

  public getDataRecorder = () => {
    if (!this.#audioRecorder?.isRecording?.()) {
      this.#data.isRecording = false;
      this.#data.secondsRecorded = 0;
    }

    return this.#data;
  };
  public getStatusMessage = () => this.#statusMessage;
  public getPlayer = () => this.#player;
  public getPlayerStatus = () => {
    this.updatePlayerStatus();

    return this.#statusPlayer;
  };

  private setStatusMessage = (message: string) => {
    if (message === this.#statusMessage) return;
    this.#statusMessage = message;
    this.emit("status-message-change", this.#statusMessage);
  };

  private saveDataStorage = (data: DataRecorder) => {
    const persisted = getPersistedData(data);
    const prevPersisted = getPersistedData(this.#prevPersistedData || data);

    if (areEqualValues(true, persisted, prevPersisted)) return;

    this.#prevPersistedData = data;
    storageManagement.save("RECORDER_DATA", data);
  };

  private setData = (
    nextData: DataRecorder | ((prev: DataRecorder) => DataRecorder),
    options?: { shouldPersist?: boolean },
  ) => {
    const prev = this.#data;
    const resolved = typeof nextData === "function" ? nextData(prev) : nextData;

    this.#data = resolved;

    if (resolved.lastUri !== prev.lastUri && resolved.lastUri) {
      this.#player.replace({ uri: resolved.lastUri });
      this.updatePlayerStatus(true);
    }

    if (options?.shouldPersist !== false) this.saveDataStorage(resolved);

    this.emit("data-change", this.#data);
  };

  private updatePlayerStatus = (force: boolean = false) => {
    const newStatus = this.#player.currentStatus;

    if (!force && areEqualValues(true, this.#statusPlayer, newStatus)) return;

    this.#statusPlayer = newStatus;
    this.emit("player-status-change", this.#statusPlayer);
  };

  private clearRecordInterval = () => {
    if (!this.#recordIntervalId) return;
    Timers.clearInterval(this.#recordIntervalId);
    this.#recordIntervalId = null;
  };

  private clearPlayerInterval = () => {
    if (!this.#playerIntervalId) return;
    Timers.clearInterval(this.#playerIntervalId);
    this.#playerIntervalId = null;
  };

  private initPlayerInterval = () => {
    this.clearPlayerInterval();

    this.#playerIntervalId = Timers.setInterval(() => {
      this.updatePlayerStatus();
    }, INTERVAL_UPDATE_PLAYER);
  };

  private recreateRecorder = () => {
    const recorder = new AudioRecorder();
    const result = recorder.enableFileOutput({
      format: FileFormat.Wav,
      preset: getRecordingPreset(this.#data.quality),
      directory: FileDirectory.Cache,
      subDirectory: "recordings",
      fileNamePrefix: "recording",
    });

    if (result.status === "error") throw new Error(result.message);

    this.#audioRecorder = recorder;
  };

  private releaseRecorder = () => {
    this.#audioRecorder?.disableFileOutput();
    this.#audioRecorder = null;
  };

  private waitForActivity = async () => {
    await new Promise<void>((resolve) => {
      Timers.setTimeout(() => resolve(), 350);
    });
  };
  private moveRecordingToCache = async (uri: string) => {
    return await wrapFunctionWithError(
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
      async (_: unknown, errorMsg: string) => {
        logger.error("RECORDER", "Error moving recording file:", errorMsg);
        return uri;
      },
    );
  };

  private updateSecondsRecorded = () => {
    if (!this.#data.isRecording) return;
    if (!this.#audioRecorder) return;

    const newSec = Math.floor(this.#audioRecorder.getCurrentDuration());

    if (newSec <= this.#data.secondsRecorded) return;

    this.setData(
      (prev) => ({
        ...prev,
        secondsRecorded: newSec,
      }),
      { shouldPersist: false },
    );

    this.setStatusMessage(
      tTyped("recorder.recording", { seconds: String(newSec) }),
    );
    this.updateRecordingNotification();

    if (
      !this.#data.infiniteRecord &&
      newSec * 1000 >= this.#data.intervalOfSaves
    ) {
      this.restartRecordingSegment();
    }
  };

  private initRecordInterval = () => {
    this.clearRecordInterval();

    this.#recordIntervalId = Timers.setInterval(() => {
      this.updateSecondsRecorded();
    }, INTERVAL_UPDATE_RECORD);
  };

  private restartRecordingSegment = async () => {
    if (!this.#data.isRecording) return;

    await this.stopRecording({ keepService: true, silent: true });
    await this.startRecording();
  };

  private syncDataFromStorage = () => {
    const data = storageManagement.get("RECORDER_DATA");
    if (!data) {
      storageManagement.save("RECORDER_DATA", this.#data);
      this.#prevPersistedData = this.#data;
      return;
    }

    this.#data = {
      ...this.#data,
      ...data,
      isRecording: false,
      secondsRecorded: 0,
    };
    this.#prevPersistedData = this.#data;

    if (this.#data.lastUri) {
      this.#player.replace({ uri: this.#data.lastUri });
      this.updatePlayerStatus(true);
    }

    this.emit("data-change", this.#data);
  };

  override async _init(): Promise<void> {
    try {
      await storageManagement.waitUntilInitialized();

      this.syncDataFromStorage();

      const permission = await AudioManager.checkRecordingPermissions();
      const hasPermission = permission === "Granted";

      if (!hasPermission) {
        modalRef.openSnackBar?.(tTyped("recorder.permissionDenied"));
      }

      this.bindRecordingNotificationEvents();

      this.#data = storageManagement.get("RECORDER_DATA");
      if (!this.#data) {
        const defaultData = getDefaultData();
        storageManagement.save("RECORDER_DATA", defaultData);
        this.#data = defaultData;
      }

      this.#player = createAudioPlayer({ uri: this.#data.lastUri });
      this.#statusPlayer = this.#player.currentStatus;

      const actions: NotificationAction[] = [
        { actionId: "stop", title: tTyped("recorder.stopRecording") },
      ];

      if (this.#data.shouldAutoStart && hasPermission) {
        AudioManager.setAudioSessionOptions({});
        await AudioManager.setAudioSessionActivity(true);
        Timers.setTimeout(this.startRecording, 1000);

        notificationsManager.sendNotification({
          actions,
          type: "info",
          title: tTyped("recorder.autoStartedTitle"),
          message: tTyped("recorder.autoStartedNotification"),
          channelId: "recorderNotification",
          reasonNotification: "recorderNotification",
          overrideNotification: true,
        });
      } else if (this.#data.shouldAutoStart && !hasPermission) {
        notificationsManager.sendNotification({
          actions,
          type: "warning",
          title: tTyped("recorder.autoStartedFailedTitle"),
          message: tTyped("recorder.autoStartedFailedNotification"),
          channelId: "recorderNotification",
          reasonNotification: "recorderNotification",
          overrideNotification: true,
        });
      }

      this.setStatusMessage(tTyped("recorder.dataLoaded"));
      this.initPlayerInterval();
    } catch (error) {
      logger.error(
        TAG,
        "Error during initialization:",
        error instanceof Error ? error.message : String(error),
      );
      modalRef.openSnackBar?.(
        tTyped("recorder.failedToInitialize", {
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  public startRecording = async () => {
    await this._init();

    await wrapFunctionWithError(
      async () => {
        if (this.#data.isRecording) return;

        const startWithFreshRecorder = async () => {
          this.recreateRecorder();
          const recorder = this.#audioRecorder;
          if (!recorder)
            throw new Error("Recorder could not be initialized correctly");

          const startResult = await recorder.start();
          if (startResult.status === "error")
            throw new Error(startResult.message);
        };

        try {
          await startWithFreshRecorder();
        } catch (error) {
          logger.error(
            "RECORDER",
            error instanceof Error ? error : String(error),
          );

          this.releaseRecorder();
          await this.waitForActivity();
          wrapFunctionWithError(startWithFreshRecorder);
        }

        this.setData(
          (prev) => ({
            ...prev,
            isRecording: true,
            secondsRecorded: 0,
          }),
          { shouldPersist: false },
        );

        this.setStatusMessage(
          tTyped("recorder.recording", { seconds: String(0) }),
        );

        this.initRecordInterval();
        await this.updateRecordingNotification(false);
      },
      async (_, errorMsg) => {
        logger.error("RECORDER", "Error starting recording:", errorMsg);
        modalRef.openSnackBar?.(
          tTyped("recorder.failedToInitialize", { message: errorMsg }),
        );
      },
    );
  };

  public stopRecording = async (options?: {
    keepService?: boolean;
    silent?: boolean;
  }) => {
    try {
      if (!this.#data.isRecording || this.#isStopping) return;
      this.#isStopping = true;

      const currentRecorder = this.#audioRecorder;
      if (!currentRecorder) {
        this.clearRecordInterval();
        this.setData(
          (prev) => ({
            ...prev,
            isRecording: false,
            secondsRecorded: 0,
          }),
          { shouldPersist: false },
        );
        this.setStatusMessage(tTyped("recorder.stopped"));
        this.saveDataStorage(this.#data);
        return;
      }

      const stopResult = await currentRecorder.stop();
      if (stopResult.status === "error") throw new Error(stopResult.message);

      const originalUri = stopResult.paths[0] || "";
      const uri = await this.moveRecordingToCache(originalUri);
      this.releaseRecorder();

      this.clearRecordInterval();

      this.setData(
        (prev) => {
          if (!uri) {
            return {
              ...prev,
              isRecording: false,
              secondsRecorded: 0,
            };
          }

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
        },
        { shouldPersist: false },
      );

      if (!options?.silent && uri)
        modalRef.openSnackBar?.(tTyped("recorder.saved", { uri }), 5000);

      this.setStatusMessage(tTyped("recorder.stopped"));
      this.saveDataStorage(this.#data);

      if (!options?.keepService) await RecordingNotificationManager.hide();
    } catch (error) {
      modalRef.openSnackBar?.(
        tTyped("recorder.failedToStop", {
          message: (error as Error).message,
        }),
      );
      logger.error("RECORDER", "Error stopping recording:", error);
    } finally {
      this.#isStopping = false;
      this.releaseRecorder();
    }
  };

  public pauseRecording = async () => {
    if (!this.#data.isRecording) return;
    if (!this.#audioRecorder) return;

    this.#audioRecorder.pause();
    this.clearRecordInterval();

    this.setData(
      (prev) => ({
        ...prev,
        isRecording: false,
      }),
      { shouldPersist: false },
    );

    await this.updateRecordingNotification(true);
  };

  public playSelectedAudio = async () => {
    const isPlaying = this.#player.playing;
    if (isPlaying) {
      this.#player.pause();
      this.updatePlayerStatus(true);
      return;
    }

    if (this.#player.currentTime >= this.#player.duration)
      await this.#player.seekTo(0);

    this.#player.play();
    this.updatePlayerStatus(true);
  };

  public actionAudio = async (uri: string, action: RecorderAction) => {
    switch (action) {
      case "select":
        this.setData((prev) => ({ ...prev, lastUri: uri }));
        break;
      case "delete": {
        this.setData((prev) => {
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
      }
      case "save": {
        const file = new File(uri);
        const base64 = await file.base64();

        const filename = `recording_${Date.now()}${file.extension || ".wav"}`;

        await downloadBase64({
          directory: "audios",
          uri: base64,
          fileName: filename,
          typeFile: `audio/${(file.extension?.replace(".", "") as "wav") || "wav"}`,
        });
        break;
      }
      default:
        break;
    }
  };

  public editDataRecorder: EditDataRecorder = async (key, value) => {
    if (key === "shouldAutoStart") {
      const permission = await AudioManager.requestRecordingPermissions();
      if (permission !== "Granted") {
        modalRef.openSnackBar?.(tTyped("recorder.permissionDenied"));
        return;
      }
    }

    storageManagement.save("RECORDER_DATA", this.#data);

    this.setData((prev) => {
      const next = {
        ...prev,
        [key]: value,
      } as DataRecorder;

      if (key === "maxXUris" && next.maxXUris < 1) next.maxXUris = 1;
      if (key === "intervalOfSaves" && next.intervalOfSaves < 1)
        next.intervalOfSaves = 1000;

      return next;
    });

    if (key === "quality") this.releaseRecorder();
  };

  public handlePressRecord = async (pause?: boolean) => {
    if (this.#data.isRecording) {
      if (pause) await this.pauseRecording();
      else await this.stopRecording();
      return;
    }

    await this.startRecording();
  };

  override destroy() {
    super.destroy();
    this.clearRecordInterval();
    this.clearPlayerInterval();
    this.#notificationPauseSubscription?.remove();
    this.#notificationResumeSubscription?.remove();
    this.#notificationPauseSubscription = null;
    this.#notificationResumeSubscription = null;
    wrapFunctionWithError(async () => {
      await RecordingNotificationManager.hide();
    });
    this.#player.remove();
    this.releaseRecorder();
    this.#isStopping = false;
  }

  constructor() {
    super();
    this.#data = storageManagement.get("RECORDER_DATA");
    this.#player = createAudioPlayer({ uri: this.#data?.lastUri });
    this.#statusPlayer = this.#player.currentStatus;
    this._reInit();
  }
}

export const recorderManager = new RecorderManager();
