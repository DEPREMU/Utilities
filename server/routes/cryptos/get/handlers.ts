import { RequestError } from "@commonSrc/both/errors/Error.ts";
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

    if (!crypto?.price)
      throw new RequestError(STATUS_RESPONSE.NOT_FOUND, "Crypto not found");

    sendResponse(STATUS_RESPONSE.SUCCESS, {
      price: crypto.price,
      priceMXN,
    });
  },
);
