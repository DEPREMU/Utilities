import {
  handleGetCryptos,
  handleGetCryptoPrice,
  handleGetCryptoBySymbol,
} from "./handlers";
import { getRouterGet } from "@common";
import { requireDependency } from "@commonSrc/serverOrElectron/express/middlewares";

export const routerCryptosGet = getRouterGet("/cryptos", {
  "/": {
    handler: handleGetCryptos,
    middlewares: [requireDependency("cryptos")],
  },
  "/:symbol": {
    handler: handleGetCryptoBySymbol,
    middlewares: [requireDependency("cryptos")],
  },
  "/price/:symbol": {
    handler: handleGetCryptoPrice,
    middlewares: [requireDependency("cryptos")],
  },
});
