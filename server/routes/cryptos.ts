import fs from "fs";
import chalk from "chalk";
import { showError } from "../functions/logger.ts";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { CryptoEvents, Cryptos, PriceBinanceAPI } from "@common";
import path from "path";
import { serverPath } from "../config.ts";
import { getEnvValue } from "../env.ts";

const cryptosFilePath = path.join(serverPath, "dev", "cryptos.json");

export const cryptos = new Cryptos(500);
void cryptos.fetchDataBinance(true);
if (getEnvValue("__DEV__")) {
  cryptos.addEventListener(CryptoEvents.UPDATE, async (d) => {
    void fs.promises.writeFile(cryptosFilePath, JSON.stringify(d), {
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
      if (!dataCrypto) {
        if (getEnvValue("__DEV__")) {
          const dataFromFile = await fs.promises.readFile(cryptosFilePath, {
            encoding: "utf-8",
          });
          const dataParsed = JSON.parse(dataFromFile) as PriceBinanceAPI;
          cryptos.prices = dataParsed;
          dataCrypto = cryptos.getCryptoBySymbol(symbol);
        }

        if (!dataCrypto)
          return sendResponse("NOT_FOUND", {
            success: false,
            error: "Crypto not found",
          });
      }

      const price = dataCrypto.price;
      const priceMXN: number | undefined = cryptos.getCryptoByBase(
        dataCrypto.quoteCoin,
        "MXN",
        "USDT",
        "BTC",
      )?.price;

      if (price === null)
        return sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: "Error fetching crypto price, price is invalid",
        });

      sendResponse("SUCCESS", {
        price,
        success: true,
        priceMXN: priceMXN ?? -1,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      showError(chalk.red("Error fetching crypto price:"), errorMessage);
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
      const cryptosFilteredByCurrency = cryptos.prices.filter((crypto) =>
        crypto.symbol.endsWith(body.currency || ""),
      );

      sendResponse("SUCCESS", {
        success: true,
        cryptos: cryptosFilteredByCurrency,
      });
    } catch (error) {
      showError(chalk.red("Error fetching cryptos:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: "Error fetching cryptos",
      });
    }
  },
);
