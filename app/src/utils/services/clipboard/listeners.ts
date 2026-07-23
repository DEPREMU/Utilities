import { TAG } from "./common";
import { Timers } from "@common";
import { logger } from "@/utils/functions";
import { REPLACERS } from "@/utils/TOP_LEVEL";
import { DataClipboard } from "./data";
import { sessionManager } from "../session";
import * as ExpoClipboard from "expo-clipboard";
import { EventClipboardNative } from "@types";
import { deviceInfo, EventsDeviceInfo } from "../deviceInfo";
import { BackgroundModule, windowModule } from "@/utils/modules";
import { DeviceEventEmitter, EmitterSubscription } from "react-native";

type Listener = ReturnType<typeof deviceInfo.addEventListener> | null;

export class ListenersClipboard extends DataClipboard {
  #intervalId: number | null = null;

  #listenerClipboard: EmitterSubscription | null = null;
  #listenerSession: Listener = null;
  #isRunningNativeService: boolean = false;
  #removeInternetListener: Listener = null;
  #removeStatePhoneListener: Listener = null;

  private initClipboardNativeListener = () => {
    if (!REPLACERS.isNative) return;
    if (this.#listenerClipboard) return;

    this.#listenerClipboard = DeviceEventEmitter.addListener(
      "ClipboardEvent",
      async (event: EventClipboardNative) => {
        switch (event.type) {
          case "update":
            this.handleInsertItem(event.text);
            break;
          case "show":
            if (!this.updatedItems) break;

            this.syncClipboardSuggestionsToModule();
            break;
          case "delete": {
            const idToDelete = event?.id || null;
            const textToDelete = event?.text || null;
            const resolvedId =
              idToDelete ||
              this.listItemsClipboard.find(
                (item) => item.content === textToDelete,
              )?.id ||
              null;

            if (!resolvedId) return;

            this.deleteItem(resolvedId);
            break;
          }
          default:
            break;
        }
      },
    );
  };

  private initInternetListener = () => {
    if (this.#removeInternetListener) return;

    this.#removeInternetListener = deviceInfo.addEventListener(
      EventsDeviceInfo.hasInternetChange,
      (hasInternet) => {
        if (!hasInternet) return;

        while (this.listItemsClipboardNoInternet.length) {
          const item = this.listItemsClipboardNoInternet.shift();
          if (!item) continue;

          this.sendMessage({
            type: "add-new-item",
            content: item.content,
          });
        }
      },
    );
  };

  private initSessionListener = () => {
    if (this.#listenerSession) return;

    const removeListenerLogin = sessionManager.addEventListener(
      "login",
      (err) => {
        if (err) {
          this.suspend();
          return;
        }

        this._reInit();
      },
    );
    const removeListenerLogout = sessionManager.addEventListener(
      "logout",
      () => {
        this.suspend();
      },
    );

    this.#listenerSession = {
      remove: () => {
        removeListenerLogin.remove();
        removeListenerLogout.remove();
      },
    };
  };

  private handleIntervalClipboardWeb = async () => {
    if (!REPLACERS.isWeb) return;

    try {
      let content: string = await windowModule.readClipboard();

      if (!content)
        content = await ExpoClipboard.getStringAsync({
          preferredFormat: ExpoClipboard.StringFormat.PLAIN_TEXT,
        });

      if (content) this.handleInsertItem(content);
    } catch (error) {
      logger.error(TAG, "Error handling interval clipboard web", error);
    }
  };

  override async resume(): Promise<void> {
    super.resume();
  }

  override async suspend(): Promise<void> {
    super.suspend();
  }

  override async destroy(): Promise<void> {
    super.destroy();

    if (this.#intervalId) {
      Timers.clearInterval(this.#intervalId);
      this.#intervalId = null;
    }

    if (this.#listenerClipboard) {
      this.#listenerClipboard.remove();
      this.#listenerClipboard = null;
    }

    if (this.#listenerSession) {
      this.#listenerSession.remove();
      this.#listenerSession = null;
    }

    if (this.#removeInternetListener) {
      this.#removeInternetListener.remove();
      this.#removeInternetListener = null;
    }

    if (this.#removeStatePhoneListener) {
      this.#removeStatePhoneListener.remove();
      this.#removeStatePhoneListener = null;
    }

    if (this.#isRunningNativeService) {
      BackgroundModule.stopClipboardService();
      this.#isRunningNativeService = false;
    }
  }

  override async _init(): Promise<void> {
    await super._init();

    if (
      REPLACERS.isNative &&
      this.clipboardData &&
      !this.#isRunningNativeService
    ) {
      BackgroundModule.startClipboardService();
      this.#isRunningNativeService = true;
    }

    if (REPLACERS.isWeb) {
      if (this.#intervalId) Timers.clearInterval(this.#intervalId);

      this.#intervalId = Timers.setInterval(() => {
        this.handleIntervalClipboardWeb();
      }, 500);
    } else {
      this.initClipboardNativeListener();
      this.#removeStatePhoneListener = deviceInfo.addEventListener(
        EventsDeviceInfo.statePhoneChange,
        (statePhone) => {
          if (statePhone === "resumed") this.resume();
          else this.suspend();
        },
      );
    }

    this.initSessionListener();
    this.initInternetListener();
  }
}
