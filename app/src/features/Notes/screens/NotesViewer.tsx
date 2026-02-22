import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import ColorPicker, {
  Panel1,
  HueCircular,
  ColorFormatsObject,
} from "reanimated-color-picker";
import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  FileFormat,
  FilePreset,
  FileDirectory,
  AudioRecorder,
} from "react-native-audio-api";
import {
  PDF,
  tTyped,
  memoDeep,
  setIntervalPolyfill,
  clearIntervalPolyfill,
} from "@utils";
import {
  Icon,
  Menu,
  Text,
  Modal,
  Button,
  Portal,
  TextInput,
  IconButton,
} from "react-native-paper";
import {
  View,
  Alert,
  Image,
  Share,
  Pressable,
  ScrollView,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
  TextInput as NativeTextInput,
  TextInputSelectionChangeEventData,
} from "react-native";
import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useLanguage } from "@context/LanguageContext";
import * as DocumentPicker from "expo-document-picker";
import { useNotesFeature } from "@screens/Notes/context/NotesContext";
import useStylesNotesScreen from "@screens/Notes/styles/useStylesNotesScreen";
import NotesAudioChoiceModal from "@screens/Notes/components/viewer/NotesAudioChoiceModal";
import type { NotesAttachment } from "@types";
import { AudioModule, createAudioPlayer } from "expo-audio";

interface NotesViewerProps {
  onBackToList: () => void;
}

interface NotesLineStyle {
  bold: boolean;
  italic: boolean;
  sizeLevel: 0 | 1 | 2;
  colorLevel: 0 | 1 | 2;
  customColor?: string;
}

type SelectionRange = { start: number; end: number };

const BASE_LINE_STYLE: NotesLineStyle = {
  bold: false,
  italic: false,
  sizeLevel: 0,
  colorLevel: 0,
};

const mapAttachmentType = (mimeType: string | null | undefined) => {
  if (!mimeType) return "other" as const;
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType.startsWith("video/")) return "video" as const;
  if (mimeType.startsWith("audio/")) return "audio" as const;
  if (mimeType.includes("application")) return "document" as const;
  return "other" as const;
};

const stripAttachmentMarkers = (value: string) =>
  value.replace(/\{\{ATTACH[^}]*\}\}/g, "");

const getLineIndexFromPosition = (content: string, position: number) => {
  const safePosition = Math.max(0, Math.min(position, content.length));
  const sliced = content.slice(0, safePosition);
  return sliced.length === 0 ? 0 : sliced.split("\n").length - 1;
};

const getLineStartPosition = (content: string, lineIndex: number) => {
  if (lineIndex <= 0) return 0;

  const lines = content.split("\n");
  let cursor = 0;
  for (let index = 0; index < lineIndex; index += 1) {
    cursor += (lines[index] || "").length;
    if (index < lineIndex) cursor += 1;
  }

  return cursor;
};

const remapLineStylesMapByLineCount = (
  previousMap: Record<number, NotesLineStyle>,
  pivotLineIndex: number,
  previousLineCount: number,
  nextLineCount: number,
) => {
  if (previousLineCount === nextLineCount) return previousMap;

  const nextMap: Record<number, NotesLineStyle> = {};
  const insertedCount = Math.max(0, nextLineCount - previousLineCount);
  const removedCount = Math.max(0, previousLineCount - nextLineCount);

  Object.entries(previousMap).forEach(([key, style]) => {
    const index = Number(key);

    if (insertedCount > 0) {
      if (index <= pivotLineIndex) {
        nextMap[index] = style;
        return;
      }

      nextMap[index + insertedCount] = style;
      return;
    }

    if (index <= pivotLineIndex) {
      nextMap[index] = style;
      return;
    }

    if (index <= pivotLineIndex + removedCount) return;
    nextMap[index - removedCount] = style;
  });

  if (insertedCount > 0) {
    const styleToInherit =
      previousMap[pivotLineIndex] ||
      previousMap[Math.max(0, pivotLineIndex - 1)] ||
      BASE_LINE_STYLE;

    for (let index = 1; index <= insertedCount; index += 1) {
      nextMap[pivotLineIndex + index] = {
        ...styleToInherit,
      };
    }
  }

  return nextMap;
};

const resolveMimeTypeFromFile = (file: {
  name?: string;
  mimeType?: string | null;
}): string | null => {
  if (file.mimeType) return file.mimeType;

  const fileName = (file.name || "").toLowerCase();
  if (fileName.endsWith(".pdf")) return "application/pdf";
  if (fileName.endsWith(".doc")) return "application/msword";
  if (fileName.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (fileName.endsWith(".xls")) return "application/vnd.ms-excel";
  if (fileName.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (fileName.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (fileName.endsWith(".pptx"))
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (fileName.endsWith(".txt")) return "text/plain";

  return null;
};

const formatAudioTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
};

const applyListAutoBehavior = (
  previousValue: string,
  nextValue: string,
): { value: string; cursor?: number } => {
  if (!nextValue.endsWith("\n")) return { value: nextValue };
  if (nextValue.length <= previousValue.length) return { value: nextValue };

  const lineBeforeBreak = nextValue.slice(0, -1).split("\n").pop() || "";
  if (!lineBeforeBreak.startsWith("- ")) return { value: nextValue };

  if (/^-\s*$/.test(lineBeforeBreak)) {
    const withoutEmptyBullet = nextValue.slice(
      0,
      -(lineBeforeBreak.length + 1),
    );
    return {
      value: withoutEmptyBullet,
      cursor: withoutEmptyBullet.length,
    };
  }

  const value = `${nextValue}- `;
  return {
    value,
    cursor: value.length,
  };
};

const NotesViewer: React.FC<NotesViewerProps> = ({ onBackToList }) => {
  const { t } = useLanguage();
  const { styles, colors } = useStylesNotesScreen();
  const {
    notes,
    closeNote,
    draftNote,
    saveDraft,
    hiddenNotes,
    pinNoteById,
    setDraftNote,
    hideNoteById,
    attachToDraft,
  } = useNotesFeature();

  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [showAudioChoiceModal, setShowAudioChoiceModal] =
    useState<boolean>(false);
  const [showTextCustomizeControls, setShowTextCustomizeControls] =
    useState<boolean>(false);
  const [showTextColorPicker, setShowTextColorPicker] =
    useState<boolean>(false);
  const [textColorPickerValue, setTextColorPickerValue] = useState<string>(
    colors.text,
  );
  const [lineStylesMap, setLineStylesMap] = useState<
    Record<number, NotesLineStyle>
  >({});
  const [showAudioRecorderControls, setShowAudioRecorderControls] =
    useState<boolean>(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState<boolean>(false);
  const [hasPausedAudioRecording, setHasPausedAudioRecording] =
    useState<boolean>(false);
  const [audioRecordedSeconds, setAudioRecordedSeconds] = useState<number>(0);
  const [openedAttachment, setOpenedAttachment] =
    useState<NotesAttachment | null>(null);
  const [isAttachmentImageError, setIsAttachmentImageError] =
    useState<boolean>(false);
  const [audioListenerState, setAudioListenerState] = useState<{
    playing: boolean;
    currentTime: number;
    duration: number;
  }>({
    playing: false,
    currentTime: 0,
    duration: 0,
  });
  const [selection, setSelection] = useState<SelectionRange>({
    start: 0,
    end: 0,
  });
  const [focusedLineIndex, setFocusedLineIndex] = useState<number>(0);
  const [forcedSelection, setForcedSelection] = useState<
    SelectionRange | undefined
  >();
  const [recordedDraftAudioUri, setRecordedDraftAudioUri] =
    useState<string>("");
  const [inlinePreviewAudioState, setInlinePreviewAudioState] = useState<{
    attachmentId: string | null;
    playing: boolean;
    currentTime: number;
    duration: number;
  }>({
    attachmentId: null,
    playing: false,
    currentTime: 0,
    duration: 0,
  });

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioAttachmentPlayerRef = useRef<ReturnType<
    typeof createAudioPlayer
  > | null>(null);
  const inlinePreviewAudioPlayerRef = useRef<ReturnType<
    typeof createAudioPlayer
  > | null>(null);
  const recordTimerIdRef = useRef<number | null>(null);
  const audioListenerTimerIdRef = useRef<number | null>(null);
  const recordingStartedAtMsRef = useRef<number | null>(null);
  const recordingAccumulatedMsRef = useRef<number>(0);
  const inlinePreviewAudioTimerIdRef = useRef<number | null>(null);
  const lineInputsRef = useRef<Record<number, { focus?: () => void } | null>>(
    {},
  );
  const lineSelectionMapRef = useRef<Record<number, SelectionRange>>({});
  const pendingFocusLineIndexRef = useRef<number | null>(null);
  const clearRecordTimerRef = useRef(() => {
    clearIntervalPolyfill(recordTimerIdRef.current);
    recordTimerIdRef.current = null;
  });
  const pauseAudioRecordingRef = useRef(async () => {
    const recorder = audioRecorderRef.current;
    if (!recorder) return;

    const stopResult = recorder.stop();
    if (stopResult.status === "error") {
      Alert.alert(tTyped("error"), stopResult.message);
      return;
    }

    recorder.disableFileOutput();
    audioRecorderRef.current = null;

    const startAt = recordingStartedAtMsRef.current;
    if (startAt)
      recordingAccumulatedMsRef.current += Math.max(0, Date.now() - startAt);
    recordingStartedAtMsRef.current = null;

    const recordedUri = stopResult.path || "";
    setRecordedDraftAudioUri(recordedUri);
    setAudioRecordedSeconds(
      Math.floor(recordingAccumulatedMsRef.current / 1000),
    );
    setIsRecordingAudio(false);
    setHasPausedAudioRecording(true);
    clearRecordTimerRef.current();
  });
  const openAudioOptionsRef = useRef(() => {
    setShowAudioChoiceModal(true);
  });
  const handleCloseAudioChoiceModalRef = useRef(() => {
    setShowAudioChoiceModal(false);
  });
  const chooseRecordAudioRef = useRef(async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(tTyped("error"), tTyped("recorder.permissionDenied"));
      return;
    }

    setShowAudioChoiceModal(false);
    setShowAudioRecorderControls(true);
    setHasPausedAudioRecording(false);
    setAudioRecordedSeconds(0);
    recordingAccumulatedMsRef.current = 0;
    recordingStartedAtMsRef.current = null;
  });
  const handleOpenAttachmentRef = useRef((attachment: NotesAttachment) => {
    setOpenedAttachment(attachment);
  });
  const handleCloseAttachmentRef = useRef(() => {
    setOpenedAttachment(null);
  });
  const toggleAttachmentAudioPlaybackRef = useRef(async () => {
    const player = audioAttachmentPlayerRef.current;
    if (!player) return;

    if (player.playing) {
      player.pause();
      return;
    }

    if (player.currentTime >= player.duration && player.duration > 0)
      await player.seekTo(0);

    await player.play();
  });
  const clearInlinePreviewAudioRef = useRef(() => {
    clearIntervalPolyfill(inlinePreviewAudioTimerIdRef.current);
    inlinePreviewAudioTimerIdRef.current = null;
    inlinePreviewAudioPlayerRef.current?.remove();
    inlinePreviewAudioPlayerRef.current = null;
    setInlinePreviewAudioState({
      attachmentId: null,
      playing: false,
      currentTime: 0,
      duration: 0,
    });
  });
  const handleToggleMenuRef = useRef(() => {
    setMenuVisible(true);
  });
  const handleCloseMenuRef = useRef(() => {
    setMenuVisible(false);
  });
  const handleToggleTextCustomizeControlsRef = useRef(() => {
    setShowTextCustomizeControls((prev) => !prev);
  });

  const editableContent = draftNote?.content || "";
  const editableLines = useMemo(
    () => editableContent.split("\n"),
    [editableContent],
  );

  const buildLineTextStyle = useCallback(
    (styleConfig?: NotesLineStyle) => {
      const style = styleConfig || BASE_LINE_STYLE;
      return {
        color:
          style.customColor ||
          [colors.text, colors.primary, colors.error][style.colorLevel],
        fontSize: [14, 17, 20][style.sizeLevel],
        fontWeight: style.bold ? ("700" as const) : ("400" as const),
        fontStyle: style.italic ? ("italic" as const) : ("normal" as const),
      };
    },
    [colors],
  );

  const getLineStyle = useCallback(
    (lineIndex: number): NotesLineStyle => {
      return lineStylesMap[lineIndex] || BASE_LINE_STYLE;
    },
    [lineStylesMap],
  );

  const activeLineIndex = useMemo(() => {
    if (focusedLineIndex >= 0) return focusedLineIndex;
    return getLineIndexFromPosition(editableContent, selection.start);
  }, [editableContent, focusedLineIndex, selection.start]);

  const activeLineStyle = useMemo(
    () => getLineStyle(activeLineIndex),
    [activeLineIndex, getLineStyle],
  );

  const draftSource = useMemo(() => {
    const allNotes = [...notes, ...hiddenNotes];
    return allNotes.find((item) => item.id === draftNote?.id);
  }, [draftNote?.id, hiddenNotes, notes]);

  const draftCharsLabel = useMemo(() => {
    if (!draftNote) return `0 ${t("notes.chars")}`;
    const contentWithoutAttachments = editableContent
      .replace(/\{\{ATTACH:[^}]*\}\}/g, "")
      .replace(/\{\{ATTACH:[^\n]*/g, "");
    const total = contentWithoutAttachments.length;
    return `${total} ${t("notes.chars")}`;
  }, [draftNote, editableContent, t]);

  const handleAttach = useCallback(
    async (type: "image" | "audio" | "document") => {
      if (!draftNote) return;
      const pick = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type:
          type === "image"
            ? ["image/*"]
            : type === "audio"
              ? ["audio/*"]
              : ["*/*"],
      });
      if (pick.canceled) return;

      const file = pick.assets?.[0];
      if (!file?.uri || !file.name) return;

      const resolvedMimeType = resolveMimeTypeFromFile({
        name: file.name,
        mimeType: file.mimeType,
      });

      const start = Math.max(0, selection.start);
      const end = Math.max(start, selection.end);
      const attachmentInserted = await attachToDraft({
        uri: file.uri,
        name: file.name,
        type: mapAttachmentType(resolvedMimeType),
        mimeType: resolvedMimeType,
        size: file.size || null,
      });

      if (!attachmentInserted) return;

      const attachmentMarker = `{{ATTACH:${attachmentInserted.id}}}`;

      setDraftNote((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          content:
            prev.content.slice(0, start) +
            attachmentMarker +
            prev.content.slice(end),
        };
      });

      setIsPreviewMode(false);
    },
    [attachToDraft, draftNote, selection.end, selection.start, setDraftNote],
  );

  const insertAttachmentMarkerToDraft = useCallback(
    (attachmentId: string) => {
      const start = Math.max(0, selection.start);
      const end = Math.max(start, selection.end);
      const attachmentMarker = `{{ATTACH:${attachmentId}}}`;

      setDraftNote((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          content:
            prev.content.slice(0, start) +
            attachmentMarker +
            prev.content.slice(end),
        };
      });
    },
    [selection.end, selection.start, setDraftNote],
  );

  const attachmentAudioTimeText = useMemo(
    () =>
      `${formatAudioTime(audioListenerState.currentTime)} / ${formatAudioTime(audioListenerState.duration)}`,
    [audioListenerState.currentTime, audioListenerState.duration],
  );

  const beginAudioRecording = useCallback(async () => {
    if (recordedDraftAudioUri) {
      try {
        new File(recordedDraftAudioUri).delete();
      } catch {
        // Ignore errors
      }
      setRecordedDraftAudioUri("");
    }

    const recorder = audioRecorderRef.current || new AudioRecorder();
    if (!audioRecorderRef.current) {
      const result = recorder.enableFileOutput({
        format: FileFormat.Wav,
        preset: FilePreset.High,
        directory: FileDirectory.Cache,
        subDirectory: "notes-recordings",
        fileNamePrefix: "note-recording",
      });

      if (result.status === "error") {
        Alert.alert(tTyped("error"), result.message);
        return;
      }
      audioRecorderRef.current = recorder;
    }

    const startResult = recorder.start();
    if (startResult.status === "error") {
      Alert.alert(tTyped("error"), startResult.message);
      return;
    }

    setIsRecordingAudio(true);
    setHasPausedAudioRecording(false);
    recordingStartedAtMsRef.current = Date.now();

    clearRecordTimerRef.current();
    const timerId = setIntervalPolyfill(() => {
      const startAt = recordingStartedAtMsRef.current;
      const elapsedMs =
        recordingAccumulatedMsRef.current +
        (startAt ? Date.now() - startAt : 0);
      setAudioRecordedSeconds(Math.floor(elapsedMs / 1000));
    }, 250);
    recordTimerIdRef.current = timerId as unknown as number;
  }, [recordedDraftAudioUri]);

  const resetAudioRecordingDraft = useCallback(async () => {
    const recorder = audioRecorderRef.current;
    if (recorder) {
      const stopResult = recorder.stop();
      if (stopResult.status === "success" && stopResult.path) {
        try {
          new File(stopResult.path).delete();
        } catch {
          // Ignore errors
        }
      }
      recorder.disableFileOutput();
      audioRecorderRef.current = null;
    }

    if (recordedDraftAudioUri) {
      try {
        new File(recordedDraftAudioUri).delete();
      } catch {
        // Ignore errors
      }
    }

    clearRecordTimerRef.current();
    recordingStartedAtMsRef.current = null;
    recordingAccumulatedMsRef.current = 0;
    setRecordedDraftAudioUri("");
    setAudioRecordedSeconds(0);
    setIsRecordingAudio(false);
    setHasPausedAudioRecording(false);
    setShowAudioRecorderControls(false);
  }, [recordedDraftAudioUri]);

  const saveRecordedAudioToDraft = useCallback(async () => {
    if (isRecordingAudio) await pauseAudioRecordingRef.current();

    const uri = recordedDraftAudioUri;
    if (!uri) {
      await resetAudioRecordingDraft();
      return;
    }

    const file = new File(uri);
    const savedAttachment = await attachToDraft({
      uri,
      name: `note-recording-${Date.now().toString()}.wav`,
      type: "audio",
      mimeType: "audio/wav",
      size: file.size || null,
      durationMs: recordingAccumulatedMsRef.current,
    });

    if (!savedAttachment) {
      await resetAudioRecordingDraft();
      return;
    }

    insertAttachmentMarkerToDraft(savedAttachment.id);
    setRecordedDraftAudioUri("");
    setShowAudioRecorderControls(false);
    setHasPausedAudioRecording(false);
    setIsRecordingAudio(false);
    setAudioRecordedSeconds(0);
    recordingStartedAtMsRef.current = null;
    recordingAccumulatedMsRef.current = 0;
    setIsPreviewMode(false);
  }, [
    attachToDraft,
    insertAttachmentMarkerToDraft,
    isRecordingAudio,
    recordedDraftAudioUri,
    resetAudioRecordingDraft,
  ]);

  const chooseSelectAudio = useCallback(async () => {
    setShowAudioChoiceModal(false);
    await handleAttach("audio");
  }, [handleAttach]);

  const handleSaveAndPreview = useCallback(async () => {
    await saveDraft();
    setIsPreviewMode(true);
  }, [saveDraft]);

  const handleShareDraft = useCallback(async () => {
    if (!draftNote) return;
    await Share.share({
      message: `${draftNote.title}\n\n${stripAttachmentMarkers(editableContent)}`,
    });
  }, [draftNote, editableContent]);

  const handleShareAttachment = useCallback(async () => {
    if (!openedAttachment) return;
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) return;
    await Sharing.shareAsync(openedAttachment.uri);
  }, [openedAttachment]);

  const openedAttachmentUri = useMemo(() => {
    if (!openedAttachment?.uri) return "";
    return encodeURI(openedAttachment.uri);
  }, [openedAttachment?.uri]);

  const toggleInlinePreviewAudio = useCallback(
    async (attachment: NotesAttachment) => {
      if (!attachment.mimeType?.startsWith("audio/")) return;

      const currentPlayer = inlinePreviewAudioPlayerRef.current;
      const sameAttachment =
        inlinePreviewAudioState.attachmentId === attachment.id;

      if (sameAttachment && currentPlayer) {
        if (currentPlayer.playing) {
          currentPlayer.pause();
          setInlinePreviewAudioState((prev) => ({
            ...prev,
            playing: false,
          }));
          return;
        }

        if (
          currentPlayer.currentTime >= currentPlayer.duration &&
          currentPlayer.duration > 0
        )
          await currentPlayer.seekTo(0);

        currentPlayer.play();
        setInlinePreviewAudioState((prev) => ({
          ...prev,
          playing: true,
        }));
        return;
      }

      clearInlinePreviewAudioRef.current();

      const uri = encodeURI(attachment.uri);
      const player = createAudioPlayer({ uri });
      inlinePreviewAudioPlayerRef.current = player;

      const listenerId = setIntervalPolyfill(() => {
        setInlinePreviewAudioState({
          attachmentId: attachment.id,
          playing: player.playing,
          currentTime: player.currentTime || 0,
          duration: player.duration || 0,
        });
      }, 200);
      inlinePreviewAudioTimerIdRef.current = listenerId as unknown as number;

      player.play();
    },
    [inlinePreviewAudioState.attachmentId],
  );

  const insertListInDraft = useCallback(() => {
    setDraftNote((prev) => {
      if (!prev) return prev;

      const lineIndex = Math.max(
        0,
        Math.min(activeLineIndex, prev.content.split("\n").length - 1),
      );
      const lines = prev.content.split("\n");
      const currentLine = lines[lineIndex] || "";
      const lineStart = getLineStartPosition(prev.content, lineIndex);
      const lineSelection = lineSelectionMapRef.current[lineIndex] || selection;
      const lineCursor = Math.max(0, lineSelection.start - lineStart);

      const hasListPrefix = currentLine.startsWith("- ");
      const nextLine = hasListPrefix
        ? currentLine.slice(2)
        : `- ${currentLine}`;
      lines[lineIndex] = nextLine;

      const nextContent = lines.join("\n");
      const nextLineStart = getLineStartPosition(nextContent, lineIndex);
      const adjustedCursor = hasListPrefix
        ? Math.max(0, lineCursor - 2)
        : lineCursor + 2;
      const cursor = nextLineStart + Math.min(adjustedCursor, nextLine.length);
      const nextSelection = { start: cursor, end: cursor };

      setFocusedLineIndex(lineIndex);
      lineSelectionMapRef.current[lineIndex] = nextSelection;
      setSelection(nextSelection);
      setForcedSelection(nextSelection);

      return {
        ...prev,
        content: nextContent,
      };
    });
  }, [activeLineIndex, selection, setDraftNote]);

  const previewBlocks = useMemo(() => {
    const blocks: Array<
      | { type: "text"; value: string; key: string }
      | { type: "attachment"; id: string; key: string }
    > = [];
    const content = draftNote?.content || "";
    const regex = /\{\{ATTACH:([a-zA-Z0-9-]+)\}\}/g;

    let last = 0;
    let index = 0;
    let match = regex.exec(content);
    while (match) {
      const from = match.index;
      const to = regex.lastIndex;
      const textPart = content.slice(last, from);
      if (textPart)
        blocks.push({
          type: "text",
          value: textPart,
          key: `text-${index}`,
        });

      blocks.push({
        type: "attachment",
        id: match[1],
        key: `attachment-${match[1]}-${index}`,
      });

      last = to;
      index += 1;
      match = regex.exec(content);
    }

    const rest = content.slice(last);
    if (rest)
      blocks.push({
        type: "text",
        value: rest,
        key: `text-tail`,
      });

    return blocks;
  }, [draftNote?.content]);

  const renderInlineTextBlock = useCallback(
    (value: string, keyPrefix: string, startLineIndex: number) => {
      const lines = value.split("\n");
      const nodes: React.ReactNode[] = [];

      lines.forEach((line, index) => {
        const lineIndex = startLineIndex + index;
        const currentLineStyle = buildLineTextStyle(getLineStyle(lineIndex));

        if (line.startsWith("- ")) {
          nodes.push(
            <View
              key={`${keyPrefix}-list-${index.toString()}`}
              style={styles.previewInlineListItem}
            >
              <Icon
                source="checkbox-blank-circle"
                size={10}
                color={colors.text}
              />
              <Text style={[styles.previewInlineListText, currentLineStyle]}>
                {line.slice(2)}
              </Text>
            </View>,
          );
        } else if (line.length > 0) {
          nodes.push(
            <Text
              key={`${keyPrefix}-text-${index.toString()}`}
              style={[styles.previewInlineText, currentLineStyle]}
            >
              {line}
            </Text>,
          );
        }

        if (index < lines.length - 1) {
          nodes.push(
            <View
              key={`${keyPrefix}-break-${index.toString()}`}
              style={styles.previewInlineBreak}
            />,
          );
        }
      });

      return nodes;
    },
    [
      buildLineTextStyle,
      colors.text,
      getLineStyle,
      styles.previewInlineBreak,
      styles.previewInlineListItem,
      styles.previewInlineListText,
      styles.previewInlineText,
    ],
  );

  const attachmentsMap = useMemo(() => {
    return (draftSource?.attachments || []).reduce<
      Record<string, NotesAttachment>
    >((acc, attachment) => {
      acc[attachment.id] = attachment;
      return acc;
    }, {});
  }, [draftSource?.attachments]);

  const handleBackPress = useCallback(() => {
    closeNote();
    onBackToList();
  }, [closeNote, onBackToList]);

  const handleDraftTitleChange = useCallback(
    (value: string) => {
      setIsPreviewMode(false);
      setDraftNote((prev) =>
        prev
          ? {
              ...prev,
              title: value,
            }
          : prev,
      );
    },
    [setDraftNote],
  );

  const handleLineSelectionChange = useCallback(
    (
      lineIndex: number,
      event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
    ) => {
      const lineStart = getLineStartPosition(editableContent, lineIndex);
      const nextSelection = {
        start: lineStart + event.nativeEvent.selection.start,
        end: lineStart + event.nativeEvent.selection.end,
      };

      lineSelectionMapRef.current[lineIndex] = nextSelection;
      setFocusedLineIndex(lineIndex);
      setSelection(nextSelection);
      if (forcedSelection) setForcedSelection(undefined);
    },
    [editableContent, forcedSelection],
  );

  const handleLineFocus = useCallback(
    (lineIndex: number) => {
      setFocusedLineIndex(lineIndex);

      const savedSelection = lineSelectionMapRef.current[lineIndex];
      if (savedSelection) {
        setSelection(savedSelection);
        if (forcedSelection) setForcedSelection(undefined);
        return;
      }

      const lineStart = getLineStartPosition(editableContent, lineIndex);
      const lineLength = (editableLines[lineIndex] || "").length;
      const nextSelection = {
        start: lineStart + lineLength,
        end: lineStart + lineLength,
      };

      lineSelectionMapRef.current[lineIndex] = nextSelection;
      setSelection(nextSelection);
      if (forcedSelection) setForcedSelection(undefined);
    },
    [editableContent, editableLines, forcedSelection],
  );

  const handleLineContentChange = useCallback(
    (lineIndex: number, value: string) => {
      setDraftNote((prev) => {
        if (!prev) return prev;

        const previousLines = prev.content.split("\n");
        const nextLines = [...previousLines];
        nextLines[lineIndex] = value;

        const rawNextContent = nextLines.join("\n");
        const autoResult = applyListAutoBehavior(prev.content, rawNextContent);
        const nextContent = autoResult.value;
        const previousLineCount = previousLines.length;
        const nextLineCount = nextContent.split("\n").length;

        if (nextLineCount !== previousLineCount) {
          setLineStylesMap((currentMap) =>
            remapLineStylesMapByLineCount(
              currentMap,
              lineIndex,
              previousLineCount,
              nextLineCount,
            ),
          );

          if (nextLineCount > previousLineCount) {
            const nextFocusedLineIndex = Math.min(
              lineIndex + 1,
              nextLineCount - 1,
            );
            pendingFocusLineIndexRef.current = nextFocusedLineIndex;
          }
        }

        if (typeof autoResult.cursor === "number") {
          const nextSelection = {
            start: autoResult.cursor,
            end: autoResult.cursor,
          };
          pendingFocusLineIndexRef.current = getLineIndexFromPosition(
            nextContent,
            autoResult.cursor,
          );
          setSelection(nextSelection);
          setForcedSelection(nextSelection);
        }

        return {
          ...prev,
          content: nextContent,
        };
      });
    },
    [setDraftNote],
  );

  const handleLineBackspaceEmpty = useCallback(
    (
      lineIndex: number,
      event: NativeSyntheticEvent<TextInputKeyPressEventData>,
    ) => {
      if (event.nativeEvent.key !== "Backspace") return;
      if (lineIndex <= 0) return;

      const lineSelection = lineSelectionMapRef.current[lineIndex];
      const lineStart = getLineStartPosition(editableContent, lineIndex);
      const localStart = (lineSelection?.start ?? lineStart) - lineStart;
      const localEnd = (lineSelection?.end ?? lineStart) - lineStart;

      if (localStart !== 0 || localEnd !== 0) return;

      lineInputsRef.current[lineIndex - 1]?.focus?.();

      setDraftNote((prev) => {
        if (!prev) return prev;

        const previousLines = prev.content.split("\n");
        if (lineIndex >= previousLines.length) return prev;

        const nextLines = previousLines.filter(
          (_, index) => index !== lineIndex,
        );
        const nextContent = nextLines.join("\n");

        setLineStylesMap((currentMap) =>
          remapLineStylesMapByLineCount(
            currentMap,
            lineIndex - 1,
            previousLines.length,
            nextLines.length,
          ),
        );

        const previousLineStart = getLineStartPosition(
          nextContent,
          lineIndex - 1,
        );
        const previousLineLength = (nextLines[lineIndex - 1] || "").length;
        const cursor = previousLineStart + previousLineLength;
        const nextSelection = { start: cursor, end: cursor };

        pendingFocusLineIndexRef.current = Math.max(0, lineIndex - 1);
        setFocusedLineIndex(Math.max(0, lineIndex - 1));
        lineSelectionMapRef.current[Math.max(0, lineIndex - 1)] = nextSelection;
        setSelection(nextSelection);
        setForcedSelection(nextSelection);

        return {
          ...prev,
          content: nextContent,
        };
      });
    },
    [editableContent, setDraftNote],
  );

  const handleOpenTextColorPicker = useCallback(() => {
    const colorFromStyle =
      activeLineStyle.customColor ||
      [colors.text, colors.primary, colors.error][activeLineStyle.colorLevel];
    setTextColorPickerValue(colorFromStyle);
    setShowTextColorPicker(true);
  }, [activeLineStyle.colorLevel, activeLineStyle.customColor, colors]);

  const handlePickTextColor = useCallback(
    (pickedColor: ColorFormatsObject) => {
      setLineStylesMap((prev) => ({
        ...prev,
        [activeLineIndex]: {
          ...getLineStyle(activeLineIndex),
          customColor: pickedColor.hex,
        },
      }));
      setTextColorPickerValue(pickedColor.hex);
    },
    [activeLineIndex, getLineStyle],
  );

  const resolveLineSelection = useCallback(
    (lineIndex: number): SelectionRange | undefined => {
      if (!forcedSelection) return undefined;

      const lineStart = getLineStartPosition(editableContent, lineIndex);
      const lineValue = editableLines[lineIndex] || "";
      const lineEnd = lineStart + lineValue.length;
      const currentSelection = forcedSelection;

      if (currentSelection.start < lineStart || currentSelection.end > lineEnd)
        return undefined;

      return {
        start: currentSelection.start - lineStart,
        end: currentSelection.end - lineStart,
      };
    },
    [editableContent, editableLines, forcedSelection],
  );

  const handleEditorSaveToggle = useCallback(async () => {
    if (isPreviewMode) {
      setIsPreviewMode(false);
      return;
    }

    await handleSaveAndPreview();
  }, [handleSaveAndPreview, isPreviewMode]);

  const handleMenuSave = useCallback(async () => {
    await handleSaveAndPreview();
    setMenuVisible(false);
  }, [handleSaveAndPreview]);

  const handleMenuHide = useCallback(async () => {
    if (!draftNote?.id) return;
    await hideNoteById(draftNote.id);
    setMenuVisible(false);
  }, [draftNote?.id, hideNoteById]);

  const handleMenuPin = useCallback(async () => {
    if (!draftNote?.id) return;
    await pinNoteById(draftNote.id, !draftSource?.isPinned);
    setMenuVisible(false);
  }, [draftNote?.id, draftSource?.isPinned, pinNoteById]);

  const handleAttachImage = useCallback(async () => {
    await handleAttach("image");
  }, [handleAttach]);

  const handleAttachDocument = useCallback(async () => {
    await handleAttach("document");
  }, [handleAttach]);

  useEffect(() => {
    if (!draftNote?.id) return;
    setIsPreviewMode(false);
    setLineStylesMap({});
  }, [draftNote?.id]);

  useEffect(() => {
    setIsAttachmentImageError(false);
  }, [openedAttachment?.id]);

  useEffect(() => {
    return () => {
      clearIntervalPolyfill(recordTimerIdRef.current);
      clearIntervalPolyfill(audioListenerTimerIdRef.current);
      clearIntervalPolyfill(inlinePreviewAudioTimerIdRef.current);

      const recorder = audioRecorderRef.current;
      if (recorder) {
        recorder.disableFileOutput();
        audioRecorderRef.current = null;
      }

      audioAttachmentPlayerRef.current?.remove();
      audioAttachmentPlayerRef.current = null;
      inlinePreviewAudioPlayerRef.current?.remove();
      inlinePreviewAudioPlayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    clearIntervalPolyfill(audioListenerTimerIdRef.current);
    audioListenerTimerIdRef.current = null;
    audioAttachmentPlayerRef.current?.remove();
    audioAttachmentPlayerRef.current = null;

    if (!openedAttachment?.mimeType?.startsWith("audio/")) {
      setAudioListenerState({
        playing: false,
        currentTime: 0,
        duration: 0,
      });
      return;
    }

    const player = createAudioPlayer({ uri: openedAttachmentUri });
    audioAttachmentPlayerRef.current = player;

    const listenerId = setIntervalPolyfill(() => {
      const currentTime = player.currentTime || 0;
      const duration = player.duration || 0;
      const playing = player.playing;

      setAudioListenerState({
        playing,
        currentTime,
        duration,
      });
    }, 200);
    audioListenerTimerIdRef.current = listenerId as unknown as number;

    return () => {
      clearIntervalPolyfill(listenerId as unknown as number);
      player.remove();
      audioAttachmentPlayerRef.current = null;
    };
  }, [openedAttachment?.id, openedAttachment?.mimeType, openedAttachmentUri]);

  useEffect(() => {
    if (!isPreviewMode) clearInlinePreviewAudioRef.current();
  }, [isPreviewMode]);

  useEffect(() => {
    const targetLineIndex = pendingFocusLineIndexRef.current;
    if (targetLineIndex === null || isPreviewMode) return;

    const timeoutId = setTimeout(() => {
      lineInputsRef.current[targetLineIndex]?.focus?.();
      pendingFocusLineIndexRef.current = null;
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [editableLines, isPreviewMode]);

  if (!draftNote)
    return (
      <Animated.View
        style={styles.emptyContainerViewer}
        entering={FadeInDown.duration(180)}
        exiting={FadeOutDown.duration(140)}
      >
        <Icon source="note-outline" size={48} color={colors.text} />
        <Text style={styles.emptyText}>{t("notes.viewerEmpty")}</Text>
      </Animated.View>
    );

  return (
    <Animated.View
      style={styles.viewerContainer}
      entering={FadeInDown.duration(180)}
      exiting={FadeOutDown.duration(140)}
    >
      <Animated.View
        style={styles.editorHeaderTop}
        entering={FadeInDown.duration(200).delay(40)}
        exiting={FadeOutDown.duration(120)}
      >
        <Pressable onPress={handleBackPress}>
          <Icon source="arrow-left" size={22} />
        </Pressable>

        <View style={styles.editorHeaderActions}>
          <Pressable onPress={handleShareDraft}>
            <Icon source="share-variant" size={20} />
          </Pressable>
          <Menu
            visible={menuVisible}
            onDismiss={handleCloseMenuRef.current}
            anchor={
              <Pressable onPress={handleToggleMenuRef.current}>
                <Icon source="dots-vertical" size={20} />
              </Pressable>
            }
          >
            <Menu.Item title={t("notes.save")} onPress={handleMenuSave} />
            <Menu.Item title={t("notes.hide")} onPress={handleMenuHide} />
            <Menu.Item title={t("notes.pin")} onPress={handleMenuPin} />
          </Menu>
        </View>
      </Animated.View>

      <View style={styles.editorMetaContainer}>
        <TextInput
          mode="flat"
          value={draftNote.title}
          onChangeText={handleDraftTitleChange}
          editable={!isPreviewMode}
          style={styles.editorTitleInput}
        />
        <Text style={styles.editorMetaText}>
          {draftSource?.updatedAt
            ? new Date(draftSource.updatedAt).toLocaleString()
            : t("notes.now")}
        </Text>
        <Text style={styles.editorMetaText}>{draftCharsLabel}</Text>
      </View>

      <ScrollView
        style={styles.editorBody}
        contentContainerStyle={styles.editorBodyContent}
      >
        {!isPreviewMode && (
          <View style={styles.editorLinesContainer}>
            {editableLines.map((line, lineIndex) => {
              const lineStyle = buildLineTextStyle(getLineStyle(lineIndex));
              const fontSize =
                typeof lineStyle.fontSize === "number"
                  ? lineStyle.fontSize
                  : 14;
              const lineHeight = Math.round(fontSize * 1.45);
              const textColor =
                typeof lineStyle.color === "string"
                  ? lineStyle.color
                  : colors.text;

              return (
                <NativeTextInput
                  multiline
                  key={`line-${lineIndex.toString()}`}
                  ref={(instance: unknown) => {
                    lineInputsRef.current[lineIndex] =
                      (instance as { focus?: () => void } | null) || null;
                  }}
                  value={line}
                  placeholder={
                    lineIndex === 0 ? t("notes.draftPlaceholder") : ""
                  }
                  placeholderTextColor={colors.text}
                  selection={resolveLineSelection(lineIndex)}
                  onChangeText={(value) =>
                    handleLineContentChange(lineIndex, value)
                  }
                  onSelectionChange={(event) =>
                    handleLineSelectionChange(lineIndex, event)
                  }
                  scrollEnabled={false}
                  selectionColor={colors.primary}
                  onFocus={() => handleLineFocus(lineIndex)}
                  onKeyPress={(event) =>
                    handleLineBackspaceEmpty(lineIndex, event)
                  }
                  style={[
                    styles.editorLineNativeInput,
                    {
                      color: textColor,
                      fontSize: lineStyle.fontSize,
                      lineHeight,
                      fontWeight: lineStyle.fontWeight,
                      fontStyle: lineStyle.fontStyle,
                    },
                  ]}
                />
              );
            })}
          </View>
        )}
        {isPreviewMode && (
          <View style={styles.previewCard}>
            {previewBlocks.length > 0 && (
              <View style={styles.previewInlineFlow}>
                {(() => {
                  let lineCursor = 0;
                  return previewBlocks.map((block) => {
                    if (block.type === "text") {
                      const nodes = renderInlineTextBlock(
                        block.value,
                        block.key,
                        lineCursor,
                      );
                      lineCursor += (block.value.match(/\n/g) || []).length;
                      return nodes;
                    }

                    const attachment = attachmentsMap[block.id];
                    if (!attachment) return null;

                    const isImageAttachment =
                      attachment.mimeType?.startsWith("image/");
                    const isAudioAttachment =
                      attachment.mimeType?.startsWith("audio/");

                    if (isAudioAttachment) {
                      const isCurrentAudio =
                        inlinePreviewAudioState.attachmentId === attachment.id;
                      const inlineTimeText = `${formatAudioTime(isCurrentAudio ? inlinePreviewAudioState.currentTime : 0)} / ${formatAudioTime(isCurrentAudio ? inlinePreviewAudioState.duration : 0)}`;

                      return (
                        <View
                          key={block.key}
                          style={styles.previewInlineAudioChip}
                        >
                          <IconButton
                            icon={
                              isCurrentAudio && inlinePreviewAudioState.playing
                                ? "pause"
                                : "play"
                            }
                            size={18}
                            mode="contained"
                            onPress={() => toggleInlinePreviewAudio(attachment)}
                          />
                          <Text
                            numberOfLines={1}
                            style={styles.previewInlineAudioText}
                          >
                            {inlineTimeText}
                          </Text>
                        </View>
                      );
                    }

                    return (
                      <Pressable
                        key={block.key}
                        style={styles.previewInlineAttachmentChip}
                        onPress={() =>
                          handleOpenAttachmentRef.current(attachment)
                        }
                      >
                        {isImageAttachment ? (
                          <Image
                            source={{ uri: attachment.uri }}
                            resizeMode="cover"
                            style={styles.previewInlineImage}
                          />
                        ) : (
                          <View style={styles.previewInlineFileRow}>
                            <Icon source="file" size={16} color={colors.text} />
                            <Text
                              numberOfLines={1}
                              style={styles.previewInlineFileText}
                            >
                              {attachment.name}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  });
                })()}
              </View>
            )}
            {previewBlocks.length === 0 && (
              <Text
                style={[
                  styles.previewContent,
                  buildLineTextStyle(getLineStyle(0)),
                ]}
              >
                {stripAttachmentMarkers(editableContent)}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {!isPreviewMode && (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOutDown}>
          <ScrollView horizontal style={styles.editorToolbar}>
            <View style={styles.editorToolbarRow}>
              <Pressable
                style={styles.toolbarButton}
                onPress={openAudioOptionsRef.current}
              >
                <Icon source="microphone" size={20} color={colors.text} />
                <Text style={styles.toolbarButtonText}>
                  {t("notes.record")}
                </Text>
              </Pressable>
              <Pressable
                style={styles.toolbarButton}
                onPress={handleAttachImage}
              >
                <Icon source="image" size={20} color={colors.text} />
                <Text style={styles.toolbarButtonText}>{t("notes.image")}</Text>
              </Pressable>
              <Pressable
                style={styles.toolbarButton}
                onPress={insertListInDraft}
              >
                <Icon
                  source="format-list-bulleted"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.toolbarButtonText}>{t("notes.list")}</Text>
              </Pressable>
              <Pressable
                style={styles.toolbarButton}
                onPress={handleAttachDocument}
              >
                <Icon
                  source="file-document-outline"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.toolbarButtonText}>
                  {t("notes.document")}
                </Text>
              </Pressable>
              <Pressable
                style={styles.toolbarButton}
                onPress={handleToggleTextCustomizeControlsRef.current}
              >
                <Icon
                  source="format-color-text"
                  size={20}
                  color={colors.text}
                />
                <Text style={styles.toolbarButtonText}>{t("notes.text")}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {!isPreviewMode && showTextCustomizeControls && (
        <Animated.View
          style={styles.textCustomizeControlsRow}
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(140)}
        >
          <IconButton
            icon="format-bold"
            size={20}
            mode={activeLineStyle.bold ? "contained" : "outlined"}
            onPress={() =>
              setLineStylesMap((prev) => ({
                ...prev,
                [activeLineIndex]: {
                  ...getLineStyle(activeLineIndex),
                  bold: !getLineStyle(activeLineIndex).bold,
                },
              }))
            }
          />
          <IconButton
            icon="format-italic"
            size={20}
            mode={activeLineStyle.italic ? "contained" : "outlined"}
            onPress={() =>
              setLineStylesMap((prev) => ({
                ...prev,
                [activeLineIndex]: {
                  ...getLineStyle(activeLineIndex),
                  italic: !getLineStyle(activeLineIndex).italic,
                },
              }))
            }
          />
          <IconButton
            icon="format-size"
            size={20}
            mode="outlined"
            onPress={() =>
              setLineStylesMap((prev) => ({
                ...prev,
                [activeLineIndex]: {
                  ...getLineStyle(activeLineIndex),
                  sizeLevel: ((getLineStyle(activeLineIndex).sizeLevel + 1) %
                    3) as 0 | 1 | 2,
                },
              }))
            }
          />
          <IconButton
            icon="palette"
            size={20}
            mode="outlined"
            onPress={handleOpenTextColorPicker}
          />
        </Animated.View>
      )}

      {!isPreviewMode && showAudioRecorderControls && (
        <Animated.View
          style={styles.audioRecordControlsRow}
          entering={FadeInDown.duration(180)}
          exiting={FadeOutDown.duration(140)}
        >
          <IconButton
            icon={isRecordingAudio ? "pause" : "microphone"}
            size={24}
            mode="contained"
            onPress={async () => {
              if (isRecordingAudio) {
                await pauseAudioRecordingRef.current();
                return;
              }
              await beginAudioRecording();
            }}
          />

          {hasPausedAudioRecording && (
            <>
              <IconButton
                icon="check"
                size={24}
                mode="contained"
                onPress={saveRecordedAudioToDraft}
              />
              <IconButton
                icon="delete"
                size={24}
                mode="contained"
                onPress={resetAudioRecordingDraft}
              />
            </>
          )}

          <Text style={styles.audioRecordTimer}>
            {formatAudioTime(audioRecordedSeconds)}
          </Text>
        </Animated.View>
      )}

      <Pressable style={styles.saveButton} onPress={handleEditorSaveToggle}>
        <Text style={styles.saveButtonText}>
          {isPreviewMode ? t("notes.edit") : t("notes.save")}
        </Text>
      </Pressable>

      <Portal>
        <Modal
          visible={showTextColorPicker}
          onDismiss={() => setShowTextColorPicker(false)}
          contentContainerStyle={styles.textColorPickerModal}
        >
          <ColorPicker
            value={textColorPickerValue}
            sliderThickness={20}
            thumbSize={24}
            onCompleteJS={handlePickTextColor}
            style={styles.textColorPicker}
            boundedThumb
          >
            <HueCircular
              containerStyle={styles.textColorPickerHue}
              thumbShape="pill"
            >
              <Panel1 style={styles.textColorPickerPanel} />
            </HueCircular>
          </ColorPicker>

          <Button
            mode="contained"
            onPress={() => setShowTextColorPicker(false)}
          >
            {t("colors.selectColor")}
          </Button>
        </Modal>

        <Modal
          visible={!!openedAttachment}
          onDismiss={handleCloseAttachmentRef.current}
          contentContainerStyle={styles.attachmentPreviewModal}
        >
          {openedAttachment && (
            <View style={styles.attachmentPreviewWrapper}>
              <View style={styles.attachmentPreviewHeader}>
                <Text numberOfLines={1} style={styles.attachmentPreviewTitle}>
                  {openedAttachment.name}
                </Text>

                <Pressable onPress={handleCloseAttachmentRef.current}>
                  <Icon source="close" size={20} color={colors.text} />
                </Pressable>
              </View>

              {openedAttachment.mimeType?.startsWith("image/") ? (
                isAttachmentImageError ? (
                  <View style={styles.attachmentPreviewError}>
                    <Icon source="image-off" size={42} color={colors.text} />
                    <Text style={styles.attachmentPreviewErrorText}>
                      {t("error")}
                    </Text>
                    <Button mode="contained" onPress={handleShareAttachment}>
                      {t("notes.openFile")}
                    </Button>
                  </View>
                ) : (
                  <Image
                    source={{ uri: openedAttachmentUri }}
                    resizeMode="contain"
                    style={styles.attachmentPreviewImage}
                    onError={() => setIsAttachmentImageError(true)}
                  />
                )
              ) : openedAttachment.mimeType === "application/pdf" ? (
                <PDF
                  source={{ uri: openedAttachmentUri }}
                  style={styles.attachmentPreviewPdf}
                  maxScale={20}
                  minScale={0.5}
                />
              ) : openedAttachment.mimeType?.startsWith("audio/") ? (
                <View style={styles.attachmentPreviewAudioContainer}>
                  <IconButton
                    icon={audioListenerState.playing ? "pause" : "play"}
                    mode="contained"
                    size={34}
                    onPress={toggleAttachmentAudioPlaybackRef.current}
                  />
                  <Text style={styles.attachmentPreviewAudioTime}>
                    {attachmentAudioTimeText}
                  </Text>
                </View>
              ) : (
                <View style={styles.attachmentPreviewFileContainer}>
                  <Icon source="file" size={42} color={colors.text} />
                  <Text style={styles.attachmentPreviewFileName}>
                    {openedAttachment.name}
                  </Text>
                  <Button mode="contained" onPress={handleShareAttachment}>
                    {t("notes.openFile")}
                  </Button>
                </View>
              )}
            </View>
          )}
        </Modal>
      </Portal>

      <NotesAudioChoiceModal
        visible={showAudioChoiceModal}
        onDismiss={handleCloseAudioChoiceModalRef.current}
        onPressRecord={chooseRecordAudioRef.current}
        onPressSelect={chooseSelectAudio}
      />
    </Animated.View>
  );
};

export default memoDeep(NotesViewer);
