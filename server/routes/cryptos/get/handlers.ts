import { cryptos } from "../variables.ts";
import { getHandlerGet, STATUS_RESPONSE } from "@common";

export const handleGetCryptos = getHandlerGet(
  "/cryptos",
  "/",
  (_, sendResponse) => {
    sendResponse(STATUS_RESPONSE.SUCCESS, { cryptos: cryptos.prices || [] });
  },
);

export const handleGetCryptoBySymbol = getHandlerGet(
  "/cryptos",
  "/:symbol",
  ({ params }, sendResponse) => {
    const crypto = cryptos.getCryptoBySymbol(params.symbol);

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      crypto,
      error: crypto ? undefined : "Crypto not found",
    });
  },
);

export const handleGetCryptoPrice = getHandlerGet(
  "/cryptos",
  "/price/:symbol",
  ({ params }, sendResponse) => {
    const crypto = cryptos.getCryptoBySymbol(params.symbol);
    let priceMXN: number | undefined;
    if (crypto) {
      priceMXN = cryptos.getCryptoByBase(crypto.quoteCoin, "MXN")?.price;
    }

    sendResponse(
      STATUS_RESPONSE.SUCCESS,
      crypto?.price
        ? { price: crypto.price, priceMXN }
        : { error: "Crypto not found" },
    );
  },
);
