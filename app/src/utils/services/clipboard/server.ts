import { ClipboardItem } from "@types";
import { REPLACERS, ServerFetch, ServiceClass } from "@common";

type ListenersClipboard = {
  "items-updated": (items: ClipboardItem[]) => void;
  "last-item-change": (content: string | null) => void;
  "connection-status": (connected: boolean) => void;
};

export abstract class ClipboardServer extends ServiceClass<ListenersClipboard> {
  abstract _init(): Promise<void>;
  abstract resume(): Promise<void>;
  abstract suspend(): Promise<void>;
  abstract destroy(): Promise<void>;
  protected abstract listItemsClipboard: ClipboardItem[];
  protected abstract addItemToClipboard(item: ClipboardItem): Promise<void>;

  readonly deleteItem = async (id: string) => {
    try {
      const { sessionManager, storageManagement } = await import("@utils");

      const token = sessionManager.getSessionData().sessionToken;
      if (!token) throw new Error("No session token found");

      const deviceId = storageManagement.get("DEVICE_ID");
      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted",
        { id, deviceId, deleted: true },
        token,
      );

      return !res.data.error;
    } catch (error) {
      REPLACERS.Logger.error("Error deleting clipboard item:", error);

      return false;
    }
  };

  readonly toggleDeleteAllItems = async (restore: boolean) => {
    try {
      const { sessionManager, storageManagement } = await import("@utils");

      const token = sessionManager.getSessionData().sessionToken;
      if (!token) throw new Error("No session token found");

      const deviceId = storageManagement.get("DEVICE_ID");
      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted-all",
        { restore, deviceId },
        token,
      );

      return !res.data.error;
    } catch (error) {
      REPLACERS.Logger.error("Error deleting all clipboard items:", error);
      return false;
    }
  };

  readonly deleteAllItems = async () => {
    return await this.toggleDeleteAllItems(false);
  };

  readonly restoreAllItems = async () => {
    return await this.toggleDeleteAllItems(true);
  };

  readonly getClipboard = async (pageNumber?: number) => {
    try {
      const { sessionManager, storageManagement } = await import("@utils");

      const token = sessionManager.getSessionData().sessionToken;
      if (!token) throw new Error("No session token found");

      const deviceId = storageManagement.get("DEVICE_ID");
      const res = await ServerFetch.get(
        "/clipboard/:deviceId/:page-number-optional",
        { deviceId, page: pageNumber },
        token,
      );

      return res.data;
    } catch (error) {
      REPLACERS.Logger.error("Error fetching clipboard items:", error);
    }
  };
}
