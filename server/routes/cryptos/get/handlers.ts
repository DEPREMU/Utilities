import { cryptos } from "../variables.ts";
import { getHandlerGet } from "@common";

export const handleGetCryptos = getHandlerGet(
  "/cryptos",
  "/",
  null as never,
  (_, sendResponse) => {
    sendResponse("SUCCESS", { cryptos: cryptos.prices });
  },
);

export const handleGetCryptoBySymbol = getHandlerGet(
  "/cryptos",
  "/:symbol",
  { symbol: "string" },
  (params, sendResponse) => {
    const crypto = cryptos.getCryptoBySymbol(params.symbol);

    sendResponse("SUCCESS", {
      crypto,
      error: crypto ? undefined : "Crypto not found",
    });
  },
);

export const handleGetCryptoPrice = getHandlerGet(
  "/cryptos",
  "/price/:symbol",
  { symbol: "string" },
  (params, sendResponse) => {
    const crypto = cryptos.getCryptoBySymbol(params.symbol);
    let priceMXN: number | undefined;
    if (crypto) {
      priceMXN = cryptos.getCryptoByBase(crypto.quoteCoin, "MXN")?.price;
    }

    sendResponse(
      "SUCCESS",
      crypto?.price
        ? { price: crypto.price, priceMXN }
        : { error: "Crypto not found" },
    );
  },
);
