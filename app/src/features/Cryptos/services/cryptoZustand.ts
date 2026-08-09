import {
  cleanFloat,
  getValueState,
  PriceBinanceAPI,
  SelectedCryptos,
} from "@common";
import { create } from "zustand";
import { CryptoManager } from "./cryptosService";
import { sessionManager } from "@utils";
import { GetStatesZustand } from "@types";

type States = GetStatesZustand<{
  prices: PriceBinanceAPI;
  loading: boolean;
  currency: string;
  settings: DB["TablesClient"]["CryptosSettings"];
  isWriting: boolean;
  refreshing: boolean;
  isDestroyed: boolean;
  selectedCryptos: SelectedCryptos;
  isServiceUnavailable: boolean;
}>;

type Actions = {
  clearCache: () => void;
  refreshPrices: () => void;
  handleCheckBoxChange: (cryptoId: string) => void;
  handleTextInputAmount: (
    text: string,
    baseCoin: string,
    quoteCoin: string,
  ) => Promise<void>;
  sync: () => Promise<void>;
};

export const useCryptoStore = create<States & Actions>((set, get) => {
  const service = CryptoManager.instance;

  const prices = service.prices || [];
  const settings =
    service.getSettings() || ({} as DB["TablesClient"]["CryptosSettings"]);
  const selectedCryptos = service.ownedCryptos;

  CryptoManager.destroy();

  const data: States & Actions = {
    // state

    prices,
    setPrices: (prices) =>
      set({ prices: getValueState(prices, () => get().prices) }),

    loading: true,
    setLoading: (loading) =>
      set({ loading: getValueState(loading, () => get().loading) }),

    isDestroyed: true,
    setIsDestroyed: (isDestroyed) =>
      set({ isDestroyed: getValueState(isDestroyed, () => get().isDestroyed) }),

    settings,
    setSettings: (v) =>
      set({
        settings: getValueState(
          v,
          () => get().settings ?? CryptoManager.instance.getSettings(),
        ),
      }),

    currency: settings?.defaultCurrency ?? "USDT",
    setCurrency: (v) =>
      set({ currency: getValueState(v, () => get().currency) }),

    isWriting: false,
    setIsWriting: (v) =>
      set({ isWriting: getValueState(v, () => get().isWriting) }),

    refreshing: false,
    setRefreshing: (v) =>
      set({ refreshing: getValueState(v, () => get().refreshing) }),

    selectedCryptos,
    setSelectedCryptos: (v) =>
      set({
        selectedCryptos: getValueState(v, () => get().selectedCryptos),
      }),

    isServiceUnavailable: false,
    setIsServiceUnavailable: (v) =>
      set({ isServiceUnavailable: getValueState(v, () => get().isServiceUnavailable) }),

    // actions

    sync: async () => {
      const { setIsWriting, setLoading, isDestroyed, setIsDestroyed } = get();
      const service = CryptoManager.instance;

      if (!isDestroyed) return;
      setLoading(true);
      setIsWriting(false);

      service.ws.shouldReconnect = true;
      service.refresh();

      setIsDestroyed(false);
    },

    clearCache: () => set({ prices: [], selectedCryptos: {} }),

    handleCheckBoxChange: (cryptoId: string) => {
      const { selectedCryptos } = get();
      const isSelected = selectedCryptos[cryptoId];
      const service = CryptoManager.instance;

      if (isSelected) {
        const newOwned = { ...selectedCryptos };
        delete newOwned[cryptoId];

        service.deleteCrypto(cryptoId);
        set({ selectedCryptos: newOwned });
      } else {
        const cryptoPrice = service.getCryptoBySymbol(cryptoId);
        if (!cryptoPrice) return;

        const crypto: SelectedCryptos[string] = {
          id: "",
          userId: "",
          amount: "0",
          symbol: cryptoId,
          baseCoin: cryptoPrice.baseCoin,
          quoteCoin: cryptoPrice.quoteCoin,
          datePurchased: new Date().toISOString(),
          firstPricePurchased: cryptoPrice.price ?? 0,
        };

        service.addCrypto(crypto);

        set({
          selectedCryptos: {
            ...selectedCryptos,
            [cryptoId]: crypto,
          },
        });
      }
    },

    refreshPrices: async () => {
      const { setRefreshing } = get();
      const service = CryptoManager.instance;

      setRefreshing(true);
      await service.refresh();
      setRefreshing(false);
    },

    handleTextInputAmount: async (text, baseCoin, quoteCoin) => {
      const { userData } = sessionManager.getSessionData();

      const userId = userData?.userId;
      if (!userId) return;

      const { setSelectedCryptos } = get();
      const service = CryptoManager.instance;

      const amount = cleanFloat(text);

      const symbol = baseCoin + quoteCoin;
      service.updateCrypto(symbol, {
        symbol,
        amount,
        baseCoin,
        quoteCoin,
      });

      setSelectedCryptos((prev) => {
        const newOwned = { ...prev };

        newOwned[symbol] = {
          id: newOwned[symbol]?.id ?? "",
          amount,
          userId,
          symbol,
          baseCoin,
          quoteCoin,
          datePurchased: new Date().toISOString(),
          firstPricePurchased: service.getCryptoBySymbol(symbol)?.price ?? 0,
        };
        return newOwned;
      });
    },
  };

  return data;
});
