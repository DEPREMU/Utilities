import {
  OptionsReconnectingWS,
  ReconnectingWebSocket,
} from "@/utils/reconnecting-websocket";
import { Helper } from "@common";
import { logger } from "@/utils/functions";
import { sessionManager } from "../session";
import { ClipboardServer } from "./server";
import { REPLACERS, URLS } from "@/utils/TOP_LEVEL";
import { storageManagement } from "../storage";
import { BackgroundModule, windowModule } from "@/utils/modules";
import { ClipboardItem, ClipboardWebSocketMessage } from "@types";

type SendMessageFunc = (
  message: ClipboardWebSocketMessage<"sentByApp">,
) => Promise<void>;

const OPTIONS_RECONNECT_WS: OptionsReconnectingWS = {
  retryDelay: REPLACERS.isNative ? 5000 : 2500,
  startClosed: true,
  pingPong: {
    expectedMessage: JSON.stringify({ type: "ping" }),
    expectedResponse: JSON.stringify({ type: "pong" }),
  },
  messagesAfterOpen: [
    async () => {
      await storageManagement.waitUntilInitialized();

      const token = storageManagement.get("USER_SESSION_TOKEN_STORAGE");
      const deviceId = storageManagement.get("DEVICE_ID");

      if (!token || !deviceId) {
        logger.error(
          "No session token or device ID found for Clipboard WebSocket initialization message.",
        );
        return "";
      }
      return JSON.stringify({
        type: "init",
        token,
        deviceId,
      });
    },
  ],
};

export class ClipboardWebSocket extends ClipboardServer {
  static instance: ClipboardWebSocket;

  #shouldConnect: boolean = true;

  override async _init(): Promise<void> {
    await Promise.all([
      sessionManager.waitUntilInitialized(),
      storageManagement.waitUntilInitialized(),
    ]);

    await this.createClipboardWebSocket();
  }

  #clipboardSocket: ReconnectingWebSocket = new ReconnectingWebSocket(
    URLS.clipboard,
    OPTIONS_RECONNECT_WS,
  );

  private createClipboardWebSocket = async () => {
    const { userData } = sessionManager.getSessionData();

    if (!userData?.userId) return;

    this.#clipboardSocket.onOpen = async () => {
      this.emit("connection-status", true);
    };

    this.#clipboardSocket.onError = (error) => {
      logger.error("Clipboard WebSocket error:", error.message || error);
      this.emit("connection-status", false);
    };

    this.#clipboardSocket.onClose = () => {
      logger.log("Clipboard WebSocket connection closed.");
      this.emit("connection-status", false);
    };

    this.#clipboardSocket.onMessage = (event) => {
      try {
        const parsedMessage: ClipboardWebSocketMessage<"sentByServer"> | null =
          Helper.JSON.parseData(event.data.toString());

        if (!parsedMessage) return;
        if (parsedMessage.type !== "new-clipboard-item") return;

        if (
          this.listItemsClipboard.some(
            (item) => item.content === parsedMessage.content,
          )
        )
          return;

        this.addItemToClipboard({
          id: parsedMessage.id,
          content: parsedMessage.content,
        });

        if (REPLACERS.isNative)
          BackgroundModule?.setClipboardText?.(parsedMessage.content);
        else if (REPLACERS.isWeb)
          windowModule.setClipboard(parsedMessage.content);
      } catch (error) {
        logger.error("Error parsing Clipboard WebSocket message:", error);
      }
    };

    this.#clipboardSocket.url = URLS.clipboard;
    this.#clipboardSocket.shouldReconnect = this.#shouldConnect;
  };

  protected override listItemsClipboard: ClipboardItem[] = [];
  protected override async addItemToClipboard(
    _item: ClipboardItem,
  ): Promise<void> {}

  override async resume(): Promise<void> {
    this.#shouldConnect = false;

    this.#clipboardSocket.close();
    this.emit("connection-status", false);
  }

  override async suspend(): Promise<void> {
    if (!this.isInitialized) return;

    this.#shouldConnect = true;

    const currentSocket = this.#clipboardSocket;
    currentSocket.reconnect();
    this._reInit();
  }

  override async destroy(): Promise<void> {
    await this.suspend();
  }

  protected sendMessage: SendMessageFunc = async (message) => {
    this.#clipboardSocket.send(JSON.stringify(message));
  };

  constructor() {
    super();
    if (ClipboardWebSocket.instance) {
      return ClipboardWebSocket.instance;
    }
    ClipboardWebSocket.instance = this;
  }
}
