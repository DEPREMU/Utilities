import {
  windowModule,
  keyboardModule,
  BackgroundModule,
} from "@/utils/modules";
import { cloneDeep } from "lodash";
import { deviceInfo } from "../deviceInfo";
import { ClipboardItem } from "@types";
import { getRandomUUID } from "@/utils/cross";
import { sessionManager } from "../session";
import { storageManagement } from "../storage";
import { ClipboardWebSocket } from "./websocket";
import { Timers, REPLACERS, ServerFetch, ClipboardStorage } from "@common";

const getItemWithMaxSize = (
  item: ClipboardItem,
  maxSize: number,
): ClipboardItem => {
  if (maxSize <= 0 || item.content.length <= maxSize) return item;

  return { ...item, content: item.content.slice(0, maxSize) };
};

export class DataClipboard extends ClipboardWebSocket {
  protected clipboardData: ClipboardStorage;

  protected updatedItems: boolean = false;
  override listItemsClipboard: ClipboardItem[] = [];
  protected listItemsClipboardNoInternet: ClipboardItem[] = [];

  protected syncClipboardSuggestionsToModule = () => {
    const func = REPLACERS.isNative
      ? keyboardModule.setClipboardSuggestions
      : windowModule.setClipboardHistory;
    func?.(this.listItemsClipboard);
    this.updatedItems = false;
  };

  public getClipboardData = () => cloneDeep(this.clipboardData);

  public existsInClipboard = (content: string) =>
    this.listItemsClipboard.some((item) => item.content === content);

  #lastItemInsertItem = "";
  public handleInsertItem = (content: string) => {
    if (
      !content ||
      content === this.#lastItemInsertItem ||
      this.existsInClipboard(content)
    )
      return;
    this.#lastItemInsertItem = content;

    if (
      !deviceInfo.hasInternet ||
      !sessionManager.getSessionData().isLoggedIn
    ) {
      const newItem: ClipboardItem = { id: getRandomUUID(), content };
      this.listItemsClipboardNoInternet.push(newItem);
      this.addItemToClipboard(newItem);
    } else {
      const maxChars = this.clipboardData.maxCharsInItem;

      this.sendMessage({
        type: "add-new-item",
        content:
          maxChars > 0 && content.length > maxChars
            ? content.slice(0, maxChars)
            : content,
      });
    }
  };

  override addItemToClipboard = async (
    item: ClipboardItem | ClipboardItem[],
  ) => {
    const isArray = Array.isArray(item);

    let newItems = this.listItemsClipboard.filter((i) =>
      isArray
        ? !item.some((it) => it.content === i.content)
        : i.content !== item.content,
    );

    if (isArray) {
      item.reverse().forEach((it) => {
        if (!it) return;

        newItems.unshift(
          getItemWithMaxSize(it, this.clipboardData.maxCharsInItem),
        );
      });
    } else
      newItems.unshift(
        getItemWithMaxSize(item, this.clipboardData.maxCharsInItem),
      );

    if (newItems.length > this.clipboardData.maxClipboardItems)
      newItems = newItems.slice(0, this.clipboardData.maxClipboardItems);

    this.listItemsClipboard = newItems;
    this.updatedItems = true;

    this.syncClipboardSuggestionsToModule();
    this.emit("items-updated", this.listItemsClipboard);
  };

  private initClipboardItems = async (page: number = 1) => {
    const { userData, sessionToken } = sessionManager.getSessionData();
    if (!userData?.userId || !sessionToken) return;

    const deviceId = storageManagement.get("DEVICE_ID");

    if (!sessionToken) return;

    const res = await ServerFetch.get(
      "/clipboard/:deviceId/:page-number-optional",
      { deviceId, page },
      sessionToken,
    );

    if ("error" in res.data) {
      REPLACERS.Logger.error("Error fetching clipboard items:", res.data.error);
      return;
    }

    const { clipboardItems } = res.data;
    if (!clipboardItems) return;

    if (clipboardItems.length === 0) return;
    await this.addItemToClipboard(
      clipboardItems
        .filter((item) => !!item.content)
        .map((item) => ({
          id: item.id || "",
          content: item.content,
        })),
    );
    if (clipboardItems.length === this.clipboardData.maxClipboardItems) return;

    await this.initClipboardItems(page + 1);
  };

  public setClipboardData = (data: Partial<ClipboardStorage>) => {
    this.clipboardData = { ...this.clipboardData, ...data };

    storageManagement.save("CLIPBOARD", this.clipboardData);
  };

  override async _init(): Promise<void> {
    try {
      await super._init();

      this.clipboardData = storageManagement.get("CLIPBOARD");
      if (!this.clipboardData) {
        const data = {
          enabled: true,
          maxCharsInItem: -1,
          maxClipboardItems: 10,
        };
        storageManagement.save("CLIPBOARD", data);
        this.clipboardData = data;
        if (REPLACERS.isNative)
          Timers.setTimeout(() => {
            BackgroundModule.startClipboardService();
          }, 10000);
      }

      const { isLoggedIn } = sessionManager.getSessionData();

      if (!isLoggedIn) return;

      this.initClipboardItems();
    } catch (error) {
      REPLACERS.Logger.error(
        "CLIPBOARD",
        "Error initializing ClipboardManager",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  override async resume(): Promise<void> {
    await super.resume();
  }

  override async suspend(): Promise<void> {
    await super.suspend();
  }

  override async destroy(): Promise<void> {
    await super.destroy();
  }

  constructor() {
    super();
    this.clipboardData = null as unknown as ClipboardStorage;
  }
}
