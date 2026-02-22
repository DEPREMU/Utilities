import type {
  NotesItem,
  NotesFolder,
  NotesSettings,
  NotesAttachment,
} from "@types";
import { useLanguage } from "@context/LanguageContext";
import { notesLocalRepository } from "@screens/Notes/services/notesLocalRepository";
import { useCallback, useEffect, useMemo, useState } from "react";
import { logger, storageManagement, getFormattedDate } from "@utils";

type DraftNote = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
};

const ALL_FOLDER_ID = "ALL";

const defaultSettings: NotesSettings = {
  syncEnabled: false,
  useVaultPassword: false,
};

const ensureSettings = (): NotesSettings => {
  const settings = storageManagement.get("NOTES_SETTINGS", defaultSettings);
  if (
    settings?.syncEnabled === undefined ||
    settings?.useVaultPassword === undefined
  ) {
    storageManagement.save("NOTES_SETTINGS", defaultSettings);
    return defaultSettings;
  }
  return settings;
};

const toPreview = (content: string, fallback: string): string => {
  const trimmed = content
    .replace(/\{\{ATTACH:[a-zA-Z0-9-]+\}\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed) return fallback;
  if (trimmed.length <= 90) return trimmed;
  return `${trimmed.slice(0, 90)}...`;
};

const getFolderIdForQuery = (folderId: string): string | null | undefined => {
  if (folderId === ALL_FOLDER_ID) return undefined;
  return folderId;
};

const extractAttachIdsFromContent = (content: string): Set<string> => {
  const matches = content.matchAll(/\{\{ATTACH:([a-zA-Z0-9-]+)\}\}/g);
  return new Set(Array.from(matches, (match) => match[1]));
};

export const useNotes = () => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>("");
  const [notes, setNotes] = useState<NotesItem[]>([]);
  const [hiddenNotes, setHiddenNotes] = useState<NotesItem[]>([]);
  const [folders, setFolders] = useState<NotesFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] =
    useState<string>(ALL_FOLDER_ID);
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [isHiddenUnlocked, setIsHiddenUnlocked] = useState<boolean>(false);
  const [settings, setSettings] = useState<NotesSettings>(() =>
    ensureSettings(),
  );
  const [draftNote, setDraftNote] = useState<DraftNote | null>(null);

  const loadNotes = useCallback(async () => {
    const folderId = getFolderIdForQuery(selectedFolderId);
    const canSearch = query.trim().length > 0;

    const result = canSearch
      ? await notesLocalRepository.searchNotes(query, folderId)
      : await notesLocalRepository.getNotes({ folderId });
    setNotes(result);

    if (isHiddenUnlocked) {
      const hidden = await notesLocalRepository.getNotes({
        includeHidden: true,
      });
      setHiddenNotes(hidden.filter((item) => item.isHidden));
    }
  }, [isHiddenUnlocked, query, selectedFolderId]);

  const loadFolders = useCallback(async () => {
    const result = await notesLocalRepository.getFolders();
    setFolders(result);
  }, []);

  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      await notesLocalRepository.initialize();
      await Promise.all([loadFolders(), loadNotes()]);
    } catch (error) {
      logger.error(
        "NOTES",
        "Failed to initialize notes",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadFolders, loadNotes]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const refresh = useCallback(async () => {
    await Promise.all([loadFolders(), loadNotes()]);
  }, [loadFolders, loadNotes]);

  const createFolder = useCallback(
    async (name: string): Promise<boolean> => {
      const trimmed = name.trim();
      if (!trimmed) return false;

      await notesLocalRepository.createFolder(trimmed);
      await loadFolders();
      return true;
    },
    [loadFolders],
  );

  const createNote = useCallback(async () => {
    const created = await notesLocalRepository.createNote({
      folderId: selectedFolderId === ALL_FOLDER_ID ? null : selectedFolderId,
      title: t("notes.untitled"),
    });

    setDraftNote({
      id: created.id,
      title: created.title,
      content: created.content,
      folderId: created.folderId,
    });
    await refresh();
  }, [refresh, selectedFolderId, t]);

  const openNote = useCallback((note: NotesItem) => {
    setDraftNote({
      id: note.id,
      title: note.title,
      content: note.content,
      folderId: note.folderId,
    });
  }, []);

  const closeNote = useCallback(() => {
    setDraftNote(null);
  }, []);

  const saveDraft = useCallback(
    async (options?: { closeDraft?: boolean }) => {
      if (!draftNote) return;

      const allNotes = [...notes, ...hiddenNotes];
      const sourceNote = allNotes.find((item) => item.id === draftNote.id);
      const referencedAttachmentIds = extractAttachIdsFromContent(
        draftNote.content,
      );
      const currentAttachments = sourceNote?.attachments || [];
      const removedAttachments = currentAttachments.filter(
        (attachment) => !referencedAttachmentIds.has(attachment.id),
      );

      await Promise.all(
        removedAttachments.map((attachment) =>
          notesLocalRepository.removeAttachment(attachment.id),
        ),
      );

      await notesLocalRepository.updateNote({
        id: draftNote.id,
        title: draftNote.title,
        content: draftNote.content,
        folderId: draftNote.folderId,
      });

      if (options?.closeDraft) setDraftNote(null);
      await refresh();
    },
    [draftNote, hiddenNotes, notes, refresh],
  );

  const toggleSelection = useCallback((noteId: string) => {
    setSelectedMap((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  }, []);

  const resetSelection = useCallback(() => {
    setSelectedMap({});
  }, []);

  const selectedIds = useMemo(
    () =>
      Object.entries(selectedMap)
        .filter(([, v]) => v)
        .map(([id]) => id),
    [selectedMap],
  );

  const hasSelection = selectedIds.length > 0;

  const bulkDelete = useCallback(async () => {
    if (!selectedIds.length) return;
    await notesLocalRepository.deleteNotes(selectedIds);
    resetSelection();
    await refresh();
  }, [refresh, resetSelection, selectedIds]);

  const bulkSetPinned = useCallback(
    async (isPinned: boolean) => {
      if (!selectedIds.length) return;
      await notesLocalRepository.setPinned(selectedIds, isPinned);
      resetSelection();
      await refresh();
    },
    [refresh, resetSelection, selectedIds],
  );

  const bulkSetHidden = useCallback(
    async (isHidden: boolean) => {
      if (!selectedIds.length) return;
      await notesLocalRepository.setHidden(selectedIds, isHidden);
      resetSelection();
      await refresh();
    },
    [refresh, resetSelection, selectedIds],
  );

  const bulkMove = useCallback(
    async (folderId: string | null) => {
      if (!selectedIds.length) return;
      await notesLocalRepository.moveNotes({ noteIds: selectedIds, folderId });
      resetSelection();
      await refresh();
    },
    [refresh, resetSelection, selectedIds],
  );

  const attachToDraft = useCallback(
    async (
      attachment: Omit<NotesAttachment, "id" | "createdAt" | "noteId">,
    ) => {
      if (!draftNote) return;
      const savedAttachment = await notesLocalRepository.saveAttachment(
        draftNote.id,
        {
          uri: attachment.uri,
          name: attachment.name,
          type: attachment.type,
          mimeType: attachment.mimeType,
          size: attachment.size,
          ...(typeof attachment.durationMs === "number"
            ? { durationMs: attachment.durationMs }
            : {}),
        },
      );
      await refresh();
      return savedAttachment;
    },
    [draftNote, refresh],
  );

  const setNotesPassword = useCallback((password: string) => {
    storageManagement.save("NOTES_PASSWORD", password);
  }, []);

  const updateSettings = useCallback(
    (next: Partial<NotesSettings>) => {
      const merged = {
        ...settings,
        ...next,
      };
      setSettings(merged);
      storageManagement.save("NOTES_SETTINGS", merged);
    },
    [settings],
  );

  const validateUnlockPassword = useCallback(
    (password: string): boolean => {
      const ownPassword = storageManagement.get("NOTES_PASSWORD", null);
      const hasOwnPassword =
        typeof ownPassword === "string" && ownPassword.length > 0;
      const ownPasswordMatches = hasOwnPassword && ownPassword === password;

      if (ownPasswordMatches) {
        setIsHiddenUnlocked(true);
        return true;
      }

      if (settings.useVaultPassword) {
        const vaultPasswords = storageManagement.get("VAULT_PASSWORD", {});
        const hasVaultMatch = Object.values(vaultPasswords || {}).some(
          (value) => value === password,
        );

        if (hasVaultMatch) {
          setIsHiddenUnlocked(true);
          return true;
        }
      }

      return false;
    },
    [settings.useVaultPassword],
  );

  const hasOwnPassword =
    typeof storageManagement.get("NOTES_PASSWORD", null) === "string" &&
    !!storageManagement.get("NOTES_PASSWORD", null)?.length;

  const hideNoteById = useCallback(
    async (noteId: string) => {
      await notesLocalRepository.updateNote({
        id: noteId,
        isHidden: true,
      });
      setDraftNote(null);
      await refresh();
    },
    [refresh],
  );

  const pinNoteById = useCallback(
    async (noteId: string, isPinned: boolean) => {
      await notesLocalRepository.updateNote({
        id: noteId,
        isPinned,
      });
      await refresh();
    },
    [refresh],
  );

  const notesWithPreview = useMemo(
    () =>
      notes.map((item) => ({
        ...item,
        preview: toPreview(item.content, t("notes.emptyPreview")),
        formattedUpdatedAt: getFormattedDate(
          new Date(item.updatedAt),
          undefined,
          {
            dateStyle: "short",
            timeStyle: "short",
          },
        ),
      })),
    [notes, t],
  );

  return {
    notes,
    folders,
    query,
    draftNote,
    settings,
    isLoading,
    selectedIds,
    hiddenNotes,
    hasSelection,
    hasOwnPassword,
    selectedMap,
    selectedFolderId,
    notesWithPreview,
    isHiddenUnlocked,
    setDraftNote,
    setQuery,
    refresh,
    openNote,
    createNote,
    closeNote,
    saveDraft,
    bulkMove,
    bulkDelete,
    createFolder,
    bulkSetHidden,
    resetSelection,
    bulkSetPinned,
    attachToDraft,
    hideNoteById,
    pinNoteById,
    updateSettings,
    setNotesPassword,
    setSelectedFolderId,
    toggleSelection,
    validateUnlockPassword,
  };
};

export default useNotes;
