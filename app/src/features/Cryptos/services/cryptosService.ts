import {
  deviceInfo,
  sessionManager,
  EventsDeviceInfo,
  storageManagement,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
} from "@utils";
import { cloneDeep } from "lodash";
import { CryptosWs, TIMES } from "./cryptoWs";
import { Crypto, CryptosSettings } from "@types";
import { CryptoEvents, InstanceManager, SelectedCryptos } from "@common";

type AdditionsData = Omit<Crypto, "id" | "datePurchased" | "userId">[];

export class CryptosService extends CryptosWs {
  #pricesListener: ReturnType<typeof this.addEventListener> | null = null;

  #settings: CryptosSettings | null = null;

  #deletes = {
    timeoutId: null as ReturnType<typeof setTimeoutPolyfill> | null,
    shouldDelete: false,
    cryptoSymbols: [] as string[],
  };

  #updates = {
    timeoutId: null as ReturnType<typeof setTimeoutPolyfill> | null,
    shouldUpdate: false,
    data: {} as {
      [symbol: string]: Partial<SelectedCryptos[string]>;
    },
  };

  #additions = {
    timeoutId: null as ReturnType<typeof setTimeoutPolyfill> | null,
    shouldAdd: false,
    data: [] as AdditionsData,
  };

  #removeHasInternetListener = deviceInfo.addEventListener(
    EventsDeviceInfo.hasInternetChange,
    async (hasInternet) => {
      if (!hasInternet) return;

      if (this.#deletes.shouldDelete) await this._deleteCryptos();

      if (this.#additions.shouldAdd) await this._addCryptos();

      if (this.#updates.shouldUpdate) await this._updateCryptos();
    },
  );

  private _updateCryptos = async () => {
    const { isLoggedIn } = sessionManager.getSessionData();
    if (!isLoggedIn) return;

    if (!this.#updates.shouldUpdate) return;
    if (!deviceInfo.hasInternet) return;

    const updates = this.#updates.data;

    this.#updates = {
      data: {},
      timeoutId: null,
      shouldUpdate: false,
    };

    if (Object.keys(updates).length === 0) return;

    Object.values(updates).forEach((crypto) => {
      this.ws?.send({
        type: "update-crypto",
        crypto,
      });
    });
  };

  public updateCrypto = async (
    symbol: string,
    cryptoData: Omit<
      Crypto,
      "uid" | "datePurchased" | "firstPricePurchased" | "userId"
    >,
  ) => {
    this.#updates.shouldUpdate = true;
    this.#updates.data[symbol] = cryptoData;

    if (this.#updates.timeoutId) clearTimeoutPolyfill(this.#updates.timeoutId);
    this.#updates.timeoutId = setTimeoutPolyfill(
      () => this._updateCryptos(),
      5000,
    );
  };

  private _deleteCryptos = async () => {
    const { isLoggedIn } = sessionManager.getSessionData();
    if (!isLoggedIn) return;

    if (!this.#deletes.shouldDelete) return;
    if (!deviceInfo.hasInternet) return;

    const cryptoSymbols = this.#deletes.cryptoSymbols;

    this.#deletes = {
      timeoutId: null,
      shouldDelete: false,
      cryptoSymbols: [],
    };

    if (cryptoSymbols.length === 0) return;

    cryptoSymbols.forEach((symbol) => {
      this.ws.send({
        type: "delete-crypto",
        symbol,
      });
    });
  };

  public deleteCrypto = async (cryptoId: string) => {
    this.#deletes.shouldDelete = true;
    this.#deletes.cryptoSymbols.push(cryptoId);
    if (this.#additions.data.find((c) => c.symbol === cryptoId))
      this.#additions.data = this.#additions.data.filter(
        (c) => c.symbol !== cryptoId,
      );

    if (this.#deletes.timeoutId) clearTimeoutPolyfill(this.#deletes.timeoutId);
    this.#deletes.timeoutId = setTimeoutPolyfill(
      () => this._deleteCryptos(),
      5000,
    );
  };

  private _addCryptos = async () => {
    const { isLoggedIn } = sessionManager.getSessionData();
    if (!isLoggedIn) return;

    if (!this.#additions.shouldAdd) return;
    if (!deviceInfo.hasInternet) return;

    const cryptosData = this.#additions.data;

    this.#additions = {
      data: [],
      timeoutId: null,
      shouldAdd: false,
    };

    if (cryptosData.length === 0) return;

    cryptosData.forEach((crypto) => {
      this.ws?.send({
        type: "add-crypto",
        crypto,
      });
    });
  };

  public addCrypto = async (cryptoData: AdditionsData[0]) => {
    this.#additions.shouldAdd = true;
    this.#additions.data.push(cryptoData);
    if (this.#deletes.cryptoSymbols.includes(cryptoData.symbol))
      this.#deletes.cryptoSymbols = this.#deletes.cryptoSymbols.filter(
        (s) => s !== cryptoData.symbol,
      );

    if (this.#additions.timeoutId)
      clearTimeoutPolyfill(this.#additions.timeoutId);
    this.#additions.timeoutId = setTimeoutPolyfill(
      () => this._addCryptos(),
      5000,
    );
  };

  public destroy() {
    import("./cryptoZustand").then(({ useCryptoStore }) => {
      const state = useCryptoStore.getState();
      state.setPrices([]);
      state.setLoading(true);
      state.setIsDestroyed(true);
      state.setSelectedCryptos({});
    });

    super.destroy();
    if (this.#pricesListener) {
      this.#pricesListener.remove();
      this.#pricesListener = null;
    }
    if (this.#deletes.timeoutId) clearTimeoutPolyfill(this.#deletes.timeoutId);
    if (this.#additions.timeoutId)
      clearTimeoutPolyfill(this.#additions.timeoutId);
    if (this.#updates.timeoutId) clearTimeoutPolyfill(this.#updates.timeoutId);
    this.#removeHasInternetListener.remove();
  }

  override getSettings(): CryptosSettings | null {
    return this.#settings ? cloneDeep(this.#settings) : null;
  }

  #shouldUpdateSettingsOnDB = true;
  override set settings(value: CryptosSettings) {
    this.#shouldUpdateSettingsOnDB = false;
    this.#settings = value;
    this.setAutoRefreshSettings(value.autoRefresh);
  }

  #saveSettings = () => {
    const settings = this.#settings;
    if (!settings) return;

    this.emit(CryptoEvents.SETTINGS_UPDATED, settings);
    storageManagement.save("CRYPTOS_SETTINGS", settings);
    import("./cryptoZustand").then(({ useCryptoStore }) => {
      const state = useCryptoStore.getState();
      state.setSettings(settings);
      state.setCurrency(settings.defaultCurrency);
    });

    const shouldUpdateSettingsOnDB = this.#shouldUpdateSettingsOnDB;
    this.#shouldUpdateSettingsOnDB = true;

    if (!shouldUpdateSettingsOnDB) return;

    const { isLoggedIn } = sessionManager.getSessionData();
    if (!isLoggedIn) return;

    settings.updatedAt = new Date().toISOString();

    this.ws.send({
      type: "sync-settings",
      settings,
    });
  };

  public setAutoRefreshSettings(
    refreshSettings: CryptosSettings["autoRefresh"],
  ): void;
  public setAutoRefreshSettings<K extends keyof CryptosSettings["autoRefresh"]>(
    key: K,
    value: CryptosSettings["autoRefresh"][K],
  ): void;
  public setAutoRefreshSettings(
    refreshSettingsOrKey:
      | CryptosSettings["autoRefresh"]
      | keyof CryptosSettings["autoRefresh"],
    value?: CryptosSettings["autoRefresh"][keyof CryptosSettings["autoRefresh"]],
  ) {
    if (!this.#settings) return;

    if (typeof refreshSettingsOrKey === "object") {
      this.#settings.autoRefresh = refreshSettingsOrKey;
    } else if (typeof value !== "undefined") {
      this.#settings.autoRefresh[refreshSettingsOrKey] = value as never;
    } else return;

    if (this.#settings.autoRefresh.enabled)
      this.startAutoUpdate(this.#settings.autoRefresh.valueMs);
    else this.stopAutoUpdate();

    this.#saveSettings();
  }

  public setNotifiSettings(
    intervalSettings: CryptosSettings["notifications"],
  ): void;
  public setNotifiSettings<K extends keyof CryptosSettings["notifications"]>(
    key: K,
    value: CryptosSettings["notifications"][K],
  ): void;
  public setNotifiSettings(
    intervalSettingsOrKey:
      | CryptosSettings["notifications"]
      | keyof CryptosSettings["notifications"],
    value?: CryptosSettings["notifications"][keyof CryptosSettings["notifications"]],
  ) {
    if (!this.#settings) return;

    if (typeof intervalSettingsOrKey === "object") {
      this.#settings.notifications = intervalSettingsOrKey;
    } else if (typeof value !== "undefined") {
      this.#settings.notifications[intervalSettingsOrKey] = value as never;
    } else return;

    this.#saveSettings();
  }

  public toggleAutoRefresh(enabled?: boolean) {
    if (!this.#settings) return;

    enabled =
      typeof enabled === "boolean"
        ? enabled
        : !this.#settings.autoRefresh.enabled;
    this.setAutoRefreshSettings("enabled", enabled);
  }

  public updateIntervalRefresh = (intervalMs: number) => {
    if (isNaN(intervalMs) || intervalMs <= 0) return;

    this.setAutoRefreshSettings("valueMs", intervalMs);
  };

  public selectCurrency = (currency: string) => {
    if (!this.#settings) return;

    this.#settings.defaultCurrency = currency;
    this.#saveSettings();
  };

  constructor() {
    super();
    const settings = storageManagement.get("CRYPTOS_SETTINGS");

    if (settings) this.settings = settings;
    if (this.#settings?.autoRefresh.enabled) this.startAutoUpdate();

    this.#pricesListener = this.addEventListener(
      CryptoEvents.UPDATE,
      async () => {
        const { useCryptoStore } = await import("./cryptoZustand");

        const state = useCryptoStore.getState();
        state.setPrices(this.prices);
      },
    );
  }
}

export const CryptoManager = new InstanceManager(
  () => new CryptosService(),
  TIMES.INSTANCE_CACHE,
  setTimeoutPolyfill,
  clearTimeoutPolyfill,
);
