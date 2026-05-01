export type EventClipboardNative =
  | {
      type: "update";
      text: string;
    }
  | {
      type: "delete";
      id?: string;
      text?: string;
    }
  | {
      type: "show";
    };

export type ClipboardItem = { id: string; content: string };

export type EventEmitterService = {
  remove: () => void;
};
