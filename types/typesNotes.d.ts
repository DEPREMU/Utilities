import type { DownloadableMimeType } from "./typesStorage";

export type NotesFolder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type RichTextStyle = {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecorationLine?: "none" | "underline" | "line-through";
};

export type RichTextRun = {
  start: number;
  end: number;
  style: RichTextStyle;
};

export type NotesAttachmentType =
  "image" | "video" | "audio" | "document" | "other";

export type NotesAttachment = {
  id: string;
  noteId: string;
  type: NotesAttachmentType;
  name: string;
  uri: string;
  mimeType: DownloadableMimeType | string | null;
  size: number | null;
  durationMs?: number;
  createdAt: string;
};

export type NotesItem = {
  id: string;
  userId?: string;
  title: string;
  content: string;
  folderId: string | null;
  isPinned: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  richTextRuns: RichTextRun[];
  attachments: NotesAttachment[];
};

export type NotesSecuritySettings = {
  useVaultPassword: boolean;
  hasOwnPassword: boolean;
};

export type NotesSettings = {
  syncEnabled: boolean;
  useVaultPassword: boolean;
};
