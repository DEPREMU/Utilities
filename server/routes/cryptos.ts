import chalk from "chalk";
import { showError } from "../functions/logger.ts";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { PriceBinanceAPI } from "@common";

export let dataBinance: PriceBinanceAPI = [];

const fetchData = async () => {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price");
    const data = await res.json();
    if (!data || !Array.isArray(data)) return;

    dataBinance = data.map((item: { symbol: string; price: string }) => ({
      symbol: item.symbol,
      price: parseFloat(item.price),
    }));
  } catch (error) {
    showError(chalk.red("Error fetching Binance data:"), error);
  }
};

fetchData();
setInterval(fetchData, 500);

export const getCryptoPrice = async (
  cryptoId: string,
  currency: string,
): Promise<number> => {
  try {
    const symbol = cryptoId.toUpperCase() + currency.toUpperCase();
    const cryptoData = dataBinance.find((item) => item.symbol === symbol);

    return cryptoData?.price ?? -1;
  } catch (error) {
    showError(chalk.red("Error fetching crypto price:"), error);
    return -1;
  }
};

export const handleGetCryptoPrice = getHandlerPost(
  "/cryptoPrice",
  {
    cryptoId: "string",
    currency: "string",
  },
  async (body, sendResponse) => {
    try {
      const { cryptoId, currency } = body;

      const [priceUSD, priceUSDTMXN] = await Promise.all([
        getCryptoPrice(cryptoId, currency),
        getCryptoPrice("USDT", "MXN"),
      ]);

      if (priceUSD === -1 || priceUSDTMXN === -1)
        return sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error:
            "Error fetching crypto price, priceUSD or priceUSDT_MXN is invalid",
        });

      sendResponse("SUCCESS", { success: true, priceUSD, priceUSDTMXN });
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
      const cryptosFilteredByCurrency = dataBinance?.filter((item) =>
        item.symbol.endsWith(body.currency || ""),
      ) as PriceBinanceAPI;

      sendResponse("SUCCESS", {
        success: true,
        cryptos: cryptosFilteredByCurrency || [],
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
