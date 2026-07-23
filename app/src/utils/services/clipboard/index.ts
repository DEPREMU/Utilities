import { ListenersClipboard } from "./listeners";

class ClipboardManager extends ListenersClipboard {
  static instance: ClipboardManager;

  override destroy(): Promise<void> {
    (ClipboardManager.instance as unknown as null) = null;

    return super.destroy();
  }

  constructor() {
    super();
    this._reInit();

    if (ClipboardManager.instance) return ClipboardManager.instance;
    ClipboardManager.instance = this;
  }
}

export const clipboardManager = new ClipboardManager();
