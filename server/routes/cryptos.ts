import {
  RequestCryptos,
  PriceBinanceAPI,
  ResponseCryptos,
  RequestCryptoPrice,
  ResponseCryptoPrice,
} from "@types";
import chalk from "chalk";
import express from "express";

export const getCryptoPrice = async (
  cryptoId: string,
  currency: string,
): Promise<number> => {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${cryptoId.toUpperCase()}${currency.toUpperCase()}`,
    );
    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error(chalk.red("Error fetching crypto price:"), error);
    return -1;
  }
};

export const handleGetCryptoPrice = async (
  req: express.Request<unknown, unknown, RequestCryptoPrice>,
  res: express.Response<ResponseCryptoPrice>,
) => {
  const { cryptoId, currency } = req.body;

  try {
    const priceUSD = await getCryptoPrice(cryptoId, currency);
    const priceUSDTMXN = await getCryptoPrice("USDT", "MXN");
    if (priceUSD === -1 || priceUSDTMXN === -1) {
      res.json({ error: "Error fetching crypto price" });
      return;
    }

    res.json({ priceUSD, priceUSDTMXN });
  } catch (error) {
    console.error(chalk.red("Error fetching crypto price:"), error);
    try {
      res.status(500).json({ error: "Error fetching crypto price" });
    } catch {
      // Ignore
    }
  }
};

export const handleGetCryptos = async (
  req: express.Request<unknown, unknown, RequestCryptos>,
  res: express.Response<ResponseCryptos>,
) => {
  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/price");
    const cryptos = (await response.json()) as PriceBinanceAPI;
    const cryptosFilteredByCurrency = cryptos.filter((item) =>
      item.symbol.endsWith(req?.body?.currency || ""),
    ) as PriceBinanceAPI;

    res.json({ cryptos: cryptosFilteredByCurrency });
  } catch (error) {
    console.error(chalk.red("Error fetching cryptos:"), error);
    try {
      res.status(500).json({ error: "Error fetching cryptos" });
    } catch {
      // Ignore
    }
  }
};
