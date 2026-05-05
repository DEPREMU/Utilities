import { CryptosSettings } from "@types";
import { EventHandler } from "./classes/events.ts";
import type { PriceBinanceAPI, SelectedCryptos } from "./keysStorage";
import axios from "axios";

export type ResponseExchangeInfo = {
  symbols: {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
  }[];
};

export type ResponsePrices = {
  price: string;
  symbol: string;
}[];

export enum CryptoEvents {
  UPDATE = "update",
  REFRESH = "refreshing",
  SYNCED_STATUS = "syncStatus",
  SETTINGS_UPDATED = "settingsUpdated",
  UPDATE_OWNED_CRYPTOS = "updateOwnedCryptos",
}

type Listeners = {
  [CryptoEvents.UPDATE]: (newData: PriceBinanceAPI) => void;
  [CryptoEvents.REFRESH]: (refreshing: boolean) => void;
  [CryptoEvents.SYNCED_STATUS]: (
    sync: "syncing" | "synced" | "error",
    settings?: CryptosSettings,
  ) => void;
  [CryptoEvents.SETTINGS_UPDATED]: (settings: CryptosSettings) => void;
  [CryptoEvents.UPDATE_OWNED_CRYPTOS]: (cryptos: SelectedCryptos) => void;
};

export class Cryptos extends EventHandler<Listeners> {
  #lastFetch: number = 0;
  #pricesData: PriceBinanceAPI = [];

  #intervalId: number | null = null;
  #autoUpdateInterval: number;

  #fetching: boolean = false;
  #fetchDataBinance = async (): Promise<PriceBinanceAPI | undefined> => {
    try {
      if (this.#fetching) return;
      this.#fetching = true;

      const [resPrices, resExchangeInfo] = await Promise.all([
        axios.get("https://api.binance.com/api/v3/ticker/price"),
        axios.get("https://api.binance.com/api/v3/exchangeInfo"),
      ]);

      const dataPrices = resPrices.data as ResponsePrices | undefined;
      if (!dataPrices || !Array.isArray(dataPrices)) return;

      const dataExchangeInfo = resExchangeInfo.data as ResponseExchangeInfo;

      const dataExchange = dataExchangeInfo.symbols.reduce(
        (acc, item) => {
          acc[item.symbol] = item;
          return acc;
        },
        {} as Record<string, (typeof dataExchangeInfo.symbols)[0] | undefined>,
      );

      const data = dataPrices
        .map((item): PriceBinanceAPI[0] | undefined => {
          const info = dataExchange[item.symbol];
          if (!info) return;

          return {
            price: parseFloat(item.price),
            symbol: item.symbol,
            baseCoin: info.baseAsset,
            quoteCoin: info.quoteAsset,
          };
        })
        .filter((v): v is PriceBinanceAPI[0] => !!v);

      return data;
    } finally {
      this.#fetching = false;
    }
  };

  public get prices(): PriceBinanceAPI {
    return this.#pricesData;
  }

  /**
   * Set new prices data and emit an update event. This should be used carefully, as it will trigger the update event for all listeners.
   *
   * @param newPrices - The new prices data to set.
   * @remarks This method is intended for internal use and should be used with caution, as it will trigger the update event for all listeners. Consider using fetchDataBinance for fetching and updating prices instead.
   */
  public set prices(newPrices: PriceBinanceAPI) {
    this.#pricesData = newPrices;
    this.emit(CryptoEvents.UPDATE, newPrices);
  }

  public getCryptoBySymbol(symbol: string): PriceBinanceAPI[0] | null {
    try {
      const cryptoData = this.#pricesData.find((c) => c.symbol === symbol);

      return cryptoData ?? null;
    } catch {
      return null;
    }
  }

  public getCryptoByBase(
    baseCoin: string,
    quoteCoin: string,
    ...args: string[]
  ): PriceBinanceAPI[0] | null {
    try {
      const cryptoData = this.#pricesData.filter(
        (c) => c.baseCoin === baseCoin,
      );
      for (const arg of [quoteCoin, ...(args ?? [])]) {
        const found = cryptoData.find((c) => c.quoteCoin === arg);
        if (found) return found;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async fetchDataBinance(force?: boolean): Promise<PriceBinanceAPI> {
    if (
      this.#pricesData.length > 0 &&
      this.#lastFetch + 5000 > Date.now() &&
      !force
    )
      return this.#pricesData;

    this.emit(CryptoEvents.REFRESH, true);
    const data = await this.#fetchDataBinance();
    this.emit(CryptoEvents.REFRESH, false);

    if (data) {
      this.#pricesData = data;
      this.#lastFetch = Date.now();
      this.emit(CryptoEvents.UPDATE, data);
    }
    return this.#pricesData;
  }

  public startAutoUpdate(interval: number = this.#autoUpdateInterval) {
    if (interval <= 0) return;
    if (this.#intervalId) clearInterval(this.#intervalId);

    this.#autoUpdateInterval = interval;
    this.#intervalId = setInterval(() => {
      this.fetchDataBinance();
    }, interval) as never;
  }

  public stopAutoUpdate() {
    if (!this.#intervalId) return;

    clearInterval(this.#intervalId);
    this.#intervalId = null;
  }

  public destroy() {
    super.destroy();
    if (this.#intervalId) clearInterval(this.#intervalId);
  }

  constructor(autoUpdateInterval?: number) {
    super();

    this.#autoUpdateInterval = autoUpdateInterval ?? 0;
  }
}
