import { Logger } from "@/utils/TOP_LEVEL/debug";
import { ClipboardItem } from "@types";
import { ServerFetch, ServiceClass, ServerError } from "@common";

const logger = new Logger("ClipboardServer");

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

  readonly deleteItem = async (id: string | string[]) => {
    try {
      const { sessionManager, storageManagement } = await import("@utils");

      const token = sessionManager.getSessionData().sessionToken;
      if (!token) throw new Error("No session token found");

      const deviceId = storageManagement.get("DEVICE_ID");
      const res = await ServerFetch.put(
        "/clipboard/delete/toggle-deleted",
        { body: { id, deviceId, deleted: true } },
        token,
      );

      if ("error" in res.data) {
        logger.error(
          "Error while deleting clipboard item:",
          ServerError.getMessage(res.data),
        );
      }

      const success = "success" in res.data && res.data.success;

      const set = new Set(id);

      this.listItemsClipboard = this.listItemsClipboard.filter(
        (i) => !set.has(i.id),
      );
      this.emit("items-updated", this.listItemsClipboard);

      return success;
    } catch (error) {
      logger.error("Error deleting clipboard item:", error);

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
        { body: { restore, deviceId } },
        token,
      );

      this.listItemsClipboard = [];
      this.emit("items-updated", this.listItemsClipboard);

      return "success" in res.data;
    } catch (error) {
      logger.error("Error deleting all clipboard items:", error);
      return false;
    }
  };

  readonly deleteAllItems = async () => {
    return await this.toggleDeleteAllItems(false);
  };

  readonly restoreAllItems = async () => {
    return await this.toggleDeleteAllItems(true);
  };

  readonly getClipboard = async (lastId?: string) => {
    try {
      const { sessionManager, storageManagement } = await import("@utils");

      const token = sessionManager.getSessionData().sessionToken;
      if (!token) throw new Error("No session token found");

      const deviceId = storageManagement.get("DEVICE_ID");
      const res = await ServerFetch.get(
        "/clipboard/:deviceId{/:lastId}",
        { params: { deviceId, lastId }, query: {} },
        token,
      );

      return res.data;
    } catch (error) {
      logger.error("Error fetching clipboard items:", error);
    }
  };
}
