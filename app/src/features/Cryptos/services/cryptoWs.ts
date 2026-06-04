import {
  URLS,
  logger,
  Cryptos,
  elapsedTime,
  CryptoEvents,
  sessionManager,
  SelectedCryptos,
  storageManagement,
  deviceInfo,
  EventsDeviceInfo,
} from "@utils";
import {
  OptionsReconnectingWS,
  ReconnectingWebSocket,
} from "@/utils/reconnecting-websocket";
import { Timers } from "@common";
import { CryptosSettings, CryptosWebSocketMessage } from "@types";

export const enum TIMES {
  PRICES_CACHE = 15 * 1000,
  INSTANCE_CACHE = 10 * 60 * 1000,
  OWNED_CRYPTOS_CACHE = 5 * 60 * 1000,
  AUTO_UPDATE_DEFAULT = 30 * 1000,
}

const TAG = "CryptoWs";

const options: OptionsReconnectingWS<CryptosWebSocketMessage<"sentByApp">> = {
  messagesAfterOpen: [
    async (ws) => {
      await sessionManager.waitUntilInitialized();
      const { userData, isLoggedIn } = sessionManager.getSessionData();

      const userId = userData?.userId;
      if (!userId || !isLoggedIn) {
        ws.shouldReconnect = false;
        return null;
      }

      const deviceId = storageManagement.get("DEVICE_ID");

      return { type: "init", userId, deviceId };
    },
    () => {
      return { type: "get-cryptos" };
    },
  ],

  pingPong: {
    expectedMessage: JSON.stringify({ type: "ping" }),
    expectedResponse: JSON.stringify({ type: "pong" }),
  },
  startClosed: true,
};

export abstract class CryptosWs extends Cryptos {
  abstract getSettings(): CryptosSettings | null;

  abstract set settings(settings: CryptosSettings);

  #ownedCryptos = {
    data: null as SelectedCryptos | null,
    lastTime: 0,
  };

  public get ownedCryptos(): SelectedCryptos {
    if (
      !elapsedTime(this.#ownedCryptos.lastTime, TIMES.OWNED_CRYPTOS_CACHE)
        .hasElapsed
    )
      return this.#ownedCryptos.data ?? {};

    return this.#ownedCryptos.data ?? {};
  }

  public deleteFromOwnedCryptos(symbol: string) {
    if (!this.#ownedCryptos.data) return;

    delete this.#ownedCryptos.data[symbol];
    this.emit(CryptoEvents.UPDATE_OWNED_CRYPTOS, this.ownedCryptos);
  }

  ws: ReconnectingWebSocket<CryptosWebSocketMessage<"sentByApp">> =
    new ReconnectingWebSocket<CryptosWebSocketMessage<"sentByApp">>(
      URLS.wsCryptos,
      options,
    );

  public refresh = async () => {
    const { isLoggedIn } = sessionManager.getSessionData();
    if (!isLoggedIn) return;

    this.emit(CryptoEvents.SYNCED_STATUS, "syncing");

    this.ws.shouldReconnect = true;
    let settings = this.getSettings();
    if (!settings) {
      settings = storageManagement.get("CRYPTOS_SETTINGS");
      if (settings) this.settings = settings;
    }

    this.ws.send({ type: "sync-settings", settings: settings ?? undefined });
    this.ws.send({ type: "get-cryptos" });
    await this.fetchDataBinance(true);
  };

  #initOnMessage = () => {
    this.ws.onMessage = async (event) => {
      try {
        if (!this.ws) return;

        const message: CryptosWebSocketMessage<"sentByServer"> = JSON.parse(
          event.data.toString(),
        );
        const { useCryptoStore } = await import("./cryptoZustand");
        const state = useCryptoStore.getState();

        switch (message.type) {
          case "synced": {
            await Timers.sleep(1000);
            this.emit(CryptoEvents.SYNCED_STATUS, "synced", message.settings);

            state.setLoading(false);
            if (message.settings) {
              state.setSettings(message.settings);
              state.setCurrency(message.settings.defaultCurrency);

              this.settings = message.settings;
            }
            break;
          }
          case "init-success":
            this.refresh();
            break;
          case "cryptos": {
            const data = Object.fromEntries(
              message.cryptos.map((c) => [c.symbol, c]),
            );

            this.#ownedCryptos = {
              data,
              lastTime: Date.now(),
            };
            state.setSelectedCryptos(data);
            this.emit(CryptoEvents.UPDATE_OWNED_CRYPTOS, this.ownedCryptos);
            break;
          }
        }
      } catch (error) {
        logger.error(
          TAG,
          "Failed to parse WebSocket message:",
          event.data.toString(),
          error instanceof Error ? error.message : String(error),
        );
      }
    };
  };

  #listenerIsBackground = deviceInfo.addEventListener(
    EventsDeviceInfo.isBackgroundChange,
    (isBackground) => {
      this.ws.shouldReconnect = !isBackground;
    },
  );

  #listenerHasInternet = deviceInfo.addEventListener(
    EventsDeviceInfo.hasInternetChange,
    (hasInternet) => {
      this.ws.shouldReconnect = hasInternet;
    },
  );

  #listenerScreenChange = deviceInfo.addEventListener(
    EventsDeviceInfo.screenChange,
    (screen) => {
      if (screen === "Cryptos") return;

      this.ws.shouldReconnect = false;
    },
  );

  private _init = () => {
    this.#initOnMessage();
  };

  override destroy(): void {
    super.destroy();
    this.ws.close();

    this.#listenerHasInternet.remove();
    this.#listenerScreenChange.remove();
    this.#listenerIsBackground.remove();
  }

  constructor() {
    const settings = storageManagement.get("CRYPTOS_SETTINGS");
    super(settings?.autoRefresh?.valueMs || TIMES.AUTO_UPDATE_DEFAULT);

    this._init();
  }
}
