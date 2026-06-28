import {
  handleGetCryptos,
  handleGetCryptoPrice,
  handleGetCryptoBySymbol,
} from "./handlers";
import { getRouterGet } from "@common";

export const routerCryptosGet = getRouterGet("/cryptos", {
  "/": { handler: handleGetCryptos },
  "/:symbol": { handler: handleGetCryptoBySymbol },
  "/price/:symbol": { handler: handleGetCryptoPrice },
});
