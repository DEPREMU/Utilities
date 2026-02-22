import { getRandomUUID, parseData, stringifyData } from "@utils";
import type {
  NotesAttachment,
  NotesFolder,
  NotesItem,
  RichTextRun,
} from "@types";
import { Directory, File, Paths } from "expo-file-system";
import * as SQLite from "expo-sqlite";

type NoteRow = {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  isPinned: number;
  isHidden: number;
  createdAt: string;
  updatedAt: string;
  richTextRuns: string;
};

type FolderRow = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type AttachmentRow = {
  id: string;
  noteId: string;
  type: NotesAttachment["type"];
  name: string;
  uri: string;
  mimeType: string | null;
  size: number | null;
  durationMs: number | null;
  createdAt: string;
};

type CreateNoteInput = {
  title?: string;
  content?: string;
  folderId?: string | null;
  isPinned?: boolean;
  isHidden?: boolean;
  richTextRuns?: RichTextRun[];
};

type UpdateNoteInput = Partial<CreateNoteInput> & {
  id: string;
};

type MoveNotesInput = {
  noteIds: string[];
  folderId: string | null;
};

const NOTES_DB_NAME = "notes-local.db";
const NOTES_DIRECTORY_NAME = "notes";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync(NOTES_DB_NAME);
  return dbPromise;
};

const getTimestamp = (): string => new Date().toISOString();

const ensureNotesDirectory = (): void => {
  const notesDirectory = new Directory(Paths.document, NOTES_DIRECTORY_NAME);
  if (!notesDirectory.exists)
    notesDirectory.create({
      idempotent: true,
      intermediates: true,
    });
};

const convertAttachment = (row: AttachmentRow): NotesAttachment => ({
  id: row.id,
  noteId: row.noteId,
  type: row.type,
  name: row.name,
  uri: row.uri,
  mimeType: row.mimeType,
  size: row.size,
  ...(typeof row.durationMs === "number" ? { durationMs: row.durationMs } : {}),
  createdAt: row.createdAt,
});

const convertNote = (
  row: NoteRow,
  attachmentsByNoteId: Record<string, NotesAttachment[]>,
): NotesItem => ({
  id: row.id,
  title: row.title,
  content: row.content,
  folderId: row.folderId,
  isPinned: !!row.isPinned,
  isHidden: !!row.isHidden,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  richTextRuns: parseData<RichTextRun[]>(row.richTextRuns || "[]") || [],
  attachments: attachmentsByNoteId[row.id] || [],
});

const mapAttachmentsByNoteId = (
  rows: AttachmentRow[],
): Record<string, NotesAttachment[]> => {
  return rows.reduce<Record<string, NotesAttachment[]>>((acc, row) => {
    if (!acc[row.noteId]) acc[row.noteId] = [];
    acc[row.noteId].push(convertAttachment(row));
    return acc;
  }, {});
};

const queryNotes = async (
  includeHidden: boolean,
  folderId?: string | null,
): Promise<NotesItem[]> => {
  const db = await getDb();
  const clauses: string[] = [];
  const args: (string | number | null)[] = [];

  if (!includeHidden) clauses.push("isHidden = 0");
  if (typeof folderId === "string") {
    clauses.push("folderId = ?");
    args.push(folderId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const notes = (await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes ${where} ORDER BY isPinned DESC, updatedAt DESC`,
    args,
  )) as NoteRow[];

  if (notes.length === 0) return [];

  const placeholders = notes.map(() => "?").join(",");
  const attachments = (await db.getAllAsync<AttachmentRow>(
    `SELECT * FROM note_attachments WHERE noteId IN (${placeholders}) ORDER BY createdAt ASC`,
    notes.map((item) => item.id),
  )) as AttachmentRow[];

  const attachmentsByNoteId = mapAttachmentsByNoteId(attachments);
  return notes.map((row) => convertNote(row, attachmentsByNoteId));
};

export const notesLocalRepository = {
  initialize: async (): Promise<void> => {
    ensureNotesDirectory();

    const db = await getDb();
    await db.execAsync(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS folders (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        folderId TEXT,
        isPinned INTEGER NOT NULL DEFAULT 0,
        isHidden INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        richTextRuns TEXT NOT NULL DEFAULT '[]',
        FOREIGN KEY(folderId) REFERENCES folders(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS note_attachments (
        id TEXT PRIMARY KEY NOT NULL,
        noteId TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        uri TEXT NOT NULL,
        mimeType TEXT,
        size INTEGER,
        durationMs INTEGER,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(noteId) REFERENCES notes(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_notes_updatedAt ON notes(updatedAt DESC);
      CREATE INDEX IF NOT EXISTS idx_notes_folderId ON notes(folderId);
      CREATE INDEX IF NOT EXISTS idx_notes_hidden ON notes(isHidden);
      CREATE INDEX IF NOT EXISTS idx_note_attachments_noteId ON note_attachments(noteId);
    `);
  },

  getFolders: async (): Promise<NotesFolder[]> => {
    const db = await getDb();
    const rows = (await db.getAllAsync<FolderRow>(
      "SELECT * FROM folders ORDER BY name COLLATE NOCASE ASC",
    )) as FolderRow[];
    return rows.map((item) => ({
      id: item.id,
      name: item.name,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
  },

  createFolder: async (name: string): Promise<NotesFolder> => {
    const db = await getDb();
    const now = getTimestamp();
    const folder: NotesFolder = {
      id: getRandomUUID(),
      name: name.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await db.runAsync(
      "INSERT INTO folders (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)",
      [folder.id, folder.name, folder.createdAt, folder.updatedAt],
    );

    return folder;
  },

  getNotes: async (params?: {
    includeHidden?: boolean;
    folderId?: string | null;
  }): Promise<NotesItem[]> => {
    const includeHidden = !!params?.includeHidden;
    const folderId = params?.folderId;
    return queryNotes(includeHidden, folderId);
  },

  createNote: async (input?: CreateNoteInput): Promise<NotesItem> => {
    const db = await getDb();
    const now = getTimestamp();
    const note: NotesItem = {
      id: getRandomUUID(),
      title: input?.title?.trim() || "Untitled",
      content: input?.content || "",
      folderId: input?.folderId || null,
      isPinned: !!input?.isPinned,
      isHidden: !!input?.isHidden,
      createdAt: now,
      updatedAt: now,
      richTextRuns: input?.richTextRuns || [],
      attachments: [],
    };

    await db.runAsync(
      "INSERT INTO notes (id, title, content, folderId, isPinned, isHidden, createdAt, updatedAt, richTextRuns) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        note.id,
        note.title,
        note.content,
        note.folderId,
        note.isPinned ? 1 : 0,
        note.isHidden ? 1 : 0,
        note.createdAt,
        note.updatedAt,
        stringifyData(note.richTextRuns),
      ],
    );

    return note;
  },

  updateNote: async (input: UpdateNoteInput): Promise<void> => {
    const db = await getDb();
    const now = getTimestamp();

    const setClauses: string[] = [];
    const args: Array<string | number | null> = [];

    if (typeof input.title === "string") {
      setClauses.push("title = ?");
      args.push(input.title.trim() || "Untitled");
    }

    if (typeof input.content === "string") {
      setClauses.push("content = ?");
      args.push(input.content);
    }

    if (typeof input.folderId !== "undefined") {
      setClauses.push("folderId = ?");
      args.push(input.folderId);
    }

    if (typeof input.isPinned === "boolean") {
      setClauses.push("isPinned = ?");
      args.push(input.isPinned ? 1 : 0);
    }

    if (typeof input.isHidden === "boolean") {
      setClauses.push("isHidden = ?");
      args.push(input.isHidden ? 1 : 0);
    }

    if (Array.isArray(input.richTextRuns)) {
      setClauses.push("richTextRuns = ?");
      args.push(stringifyData(input.richTextRuns));
    }

    setClauses.push("updatedAt = ?");
    args.push(now);
    args.push(input.id);

    await db.runAsync(
      `UPDATE notes SET ${setClauses.join(", ")} WHERE id = ?`,
      args,
    );
  },

  deleteNotes: async (noteIds: string[]): Promise<void> => {
    if (noteIds.length === 0) return;
    const db = await getDb();
    const placeholders = noteIds.map(() => "?").join(",");
    await db.runAsync(
      `DELETE FROM notes WHERE id IN (${placeholders})`,
      noteIds,
    );
  },

  moveNotes: async ({ noteIds, folderId }: MoveNotesInput): Promise<void> => {
    if (noteIds.length === 0) return;
    const db = await getDb();
    const now = getTimestamp();
    const placeholders = noteIds.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE notes SET folderId = ?, updatedAt = ? WHERE id IN (${placeholders})`,
      [folderId, now, ...noteIds],
    );
  },

  setPinned: async (noteIds: string[], isPinned: boolean): Promise<void> => {
    if (noteIds.length === 0) return;
    const db = await getDb();
    const now = getTimestamp();
    const placeholders = noteIds.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE notes SET isPinned = ?, updatedAt = ? WHERE id IN (${placeholders})`,
      [isPinned ? 1 : 0, now, ...noteIds],
    );
  },

  setHidden: async (noteIds: string[], isHidden: boolean): Promise<void> => {
    if (noteIds.length === 0) return;
    const db = await getDb();
    const now = getTimestamp();
    const placeholders = noteIds.map(() => "?").join(",");
    await db.runAsync(
      `UPDATE notes SET isHidden = ?, updatedAt = ? WHERE id IN (${placeholders})`,
      [isHidden ? 1 : 0, now, ...noteIds],
    );
  },

  saveAttachment: async (
    noteId: string,
    params: {
      uri: string;
      name: string;
      type: NotesAttachment["type"];
      mimeType: string | null;
      size: number | null;
      durationMs?: number;
    },
  ): Promise<NotesAttachment> => {
    const db = await getDb();
    ensureNotesDirectory();

    const noteDirectory = new Directory(
      Paths.document,
      NOTES_DIRECTORY_NAME,
      noteId,
    );
    if (!noteDirectory.exists)
      noteDirectory.create({
        idempotent: true,
        intermediates: true,
      });

    const id = getRandomUUID();
    const safeName = params.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const destination = new File(noteDirectory, `${id}-${safeName}`);
    const source = new File(params.uri);
    source.copy(destination);

    const now = getTimestamp();
    const attachment: NotesAttachment = {
      id,
      noteId,
      type: params.type,
      name: params.name,
      uri: destination.uri,
      mimeType: params.mimeType,
      size: params.size,
      ...(typeof params.durationMs === "number"
        ? { durationMs: params.durationMs }
        : {}),
      createdAt: now,
    };

    await db.runAsync(
      "INSERT INTO note_attachments (id, noteId, type, name, uri, mimeType, size, durationMs, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        attachment.id,
        attachment.noteId,
        attachment.type,
        attachment.name,
        attachment.uri,
        attachment.mimeType,
        attachment.size,
        attachment.durationMs || null,
        attachment.createdAt,
      ],
    );

    return attachment;
  },

  removeAttachment: async (attachmentId: string): Promise<void> => {
    const db = await getDb();
    const row = (await db.getFirstAsync<AttachmentRow>(
      "SELECT * FROM note_attachments WHERE id = ?",
      [attachmentId],
    )) as AttachmentRow | null;

    if (row) {
      const file = new File(row.uri);
      if (file.exists) file.delete();
      await db.runAsync("DELETE FROM note_attachments WHERE id = ?", [
        attachmentId,
      ]);
    }
  },

  searchNotes: async (
    query: string,
    folderId?: string | null,
  ): Promise<NotesItem[]> => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return queryNotes(false, folderId);

    const notes = await queryNotes(false, folderId);
    const titleMatches = notes.filter((item) =>
      item.title.toLowerCase().includes(normalized),
    );
    const contentMatches = notes.filter(
      (item) =>
        !item.title.toLowerCase().includes(normalized) &&
        item.content.toLowerCase().includes(normalized),
    );
    return [...titleMatches, ...contentMatches];
  },
};
