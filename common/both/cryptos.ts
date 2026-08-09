import axios, { AxiosError } from "axios";
import { EventHandler } from "./classes/events.ts";
import type { PriceBinanceAPI, SelectedCryptos } from "./keysStorage";

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
  SERVICE_UNAVAILABLE = "serviceUnavailable",
  UPDATE_OWNED_CRYPTOS = "updateOwnedCryptos",
}

const MAX_TIME_CRYPTOS = 2 * 60 * 1000;

type Listeners = {
  [CryptoEvents.UPDATE]: (newData: PriceBinanceAPI) => void;
  [CryptoEvents.REFRESH]: (refreshing: boolean) => void;
  [CryptoEvents.SYNCED_STATUS]: (
    sync: "syncing" | "synced" | "error",
    settings?: DB["TablesClient"]["CryptosSettings"],
  ) => void;
  [CryptoEvents.SETTINGS_UPDATED]: (
    settings: DB["TablesClient"]["CryptosSettings"],
  ) => void;
  [CryptoEvents.SERVICE_UNAVAILABLE]: (isUnavailable: boolean) => void;
  [CryptoEvents.UPDATE_OWNED_CRYPTOS]: (cryptos: SelectedCryptos) => void;
};

export class Cryptos extends EventHandler<Listeners> {
  #lastFetch: number = 0;
  #pricesData: PriceBinanceAPI | null = null;

  #intervalId: number | null = null;
  #autoUpdateInterval: number;

  #fetching: boolean = false;
  async #fetchDataBinance(): Promise<PriceBinanceAPI | undefined> {
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
    } catch (e) {
      if (e instanceof AxiosError && e.response?.status === 503)
        this.emit(CryptoEvents.SERVICE_UNAVAILABLE, true);
    } finally {
      this.#fetching = false;
    }
  }

  public get prices(): PriceBinanceAPI | null {
    return (this.#pricesData =
      Date.now() - this.#lastFetch > MAX_TIME_CRYPTOS
        ? null
        : this.#pricesData);
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
      const cryptoData = this.#pricesData?.find((c) => c.symbol === symbol);

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
      const cryptoData = this.#pricesData?.filter(
        (c) => c.baseCoin === baseCoin,
      );
      if (cryptoData) {
        for (const arg of [quoteCoin, ...(args ?? [])]) {
          const found = cryptoData.find((c) => c.quoteCoin === arg);
          if (found) return found;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  public async fetchDataBinance(
    force?: boolean,
  ): Promise<PriceBinanceAPI | null> {
    if (
      !force &&
      this.#pricesData &&
      this.#pricesData.length > 0 &&
      this.#lastFetch + 5000 > Date.now()
    )
      return this.#pricesData;

    this.emit(CryptoEvents.REFRESH, true);
    const data = await this.#fetchDataBinance();

    if (data) {
      this.emit(CryptoEvents.SERVICE_UNAVAILABLE, false);
      this.prices = data;
      this.#lastFetch = Date.now();
      this.emit(CryptoEvents.UPDATE, data);
    }

    this.emit(CryptoEvents.REFRESH, false);
    return this.#pricesData;
  }

  public startAutoUpdate(interval: number = this.#autoUpdateInterval) {
    if (interval <= 0) return;
    if (this.#intervalId) clearInterval(this.#intervalId);

    this.#autoUpdateInterval = interval;
    this.#intervalId = setInterval(() => {
      void this.fetchDataBinance();
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
