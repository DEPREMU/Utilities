import path from "path";
import chalk from "chalk";
import { getHandlerPost } from "@/functions/getHandlerPost.ts";
import { REPLACERS, serverPath } from "@/config.ts";
import { Logger, CryptoEvents, Cryptos, PriceBinanceAPI, File } from "@common";

const cryptosFilePath = path.join(serverPath, "dev", "cryptos.json");

export const cryptos = new Cryptos(500);
void cryptos.fetchDataBinance(true);
if (REPLACERS.isDev) {
  cryptos.addEventListener(CryptoEvents.UPDATE, async (d) => {
    void new File(cryptosFilePath).writeFile(JSON.stringify(d), {
      encoding: "utf-8",
    });
  });
}

export const handleGetCryptoPrice = getHandlerPost(
  "/cryptoPrice",
  { symbol: "string" },
  async (body, sendResponse) => {
    try {
      const { symbol } = body;

      let dataCrypto = cryptos.getCryptoBySymbol(symbol);
      if (REPLACERS.isDev && !dataCrypto) {
        const dataFromFile = await new File(cryptosFilePath).readFile("utf-8");
        const dataParsed = JSON.parse(dataFromFile || "[]") as PriceBinanceAPI;
        cryptos.prices = dataParsed;
        dataCrypto = cryptos.getCryptoBySymbol(symbol);
      }

      if (!dataCrypto)
        return sendResponse("NOT_FOUND", {
          success: false,
          error: "Crypto not found",
        });

      const price = dataCrypto.price;
      const priceMXN: number | undefined = cryptos.getCryptoByBase(
        dataCrypto.quoteCoin,
        "MXN",
        "USDT",
        "BTC",
      )?.price;

      sendResponse("SUCCESS", {
        price,
        success: true,
        priceMXN: priceMXN ?? -1,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      Logger.error(chalk.red("Error fetching crypto price:"), errorMessage);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: "Error fetching crypto price: " + errorMessage,
      });
    }
  },
);

export const handleGetCryptos = getHandlerPost(
  "/cryptos",
  {},
  async (body, sendResponse) => {
    try {
      const cryptosFilteredByCurrency = body.currency
        ? cryptos.prices.filter((crypto) =>
            crypto.symbol.endsWith(body.currency || ""),
          )
        : cryptos.prices;

      sendResponse("SUCCESS", {
        success: true,
        cryptos: cryptosFilteredByCurrency,
      });
    } catch (error) {
      Logger.error(chalk.red("Error fetching cryptos:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: "Error fetching cryptos",
      });
    }
  },
);
