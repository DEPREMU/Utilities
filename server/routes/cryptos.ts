import {
  RequestCryptos,
  PriceBinanceAPI,
  ResponseCryptos,
  RequestCryptoPrice,
  ResponseCryptoPrice,
} from "@types";
import chalk from "chalk";
import express from "express";
import { sendResponse } from "../variables.ts";

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
    console.error(chalk.red("Error fetching Binance data:"), error);
  }
};

fetchData();
setInterval(fetchData, 500);

export const getCryptoPrice = async (
  cryptoId: string,
  currency: string,
): Promise<number> => {
  try {
    return (
      dataBinance?.find((item) => item.symbol === `${cryptoId}${currency}`)
        ?.price ?? -1
    );
  } catch (error) {
    console.error(chalk.red("Error fetching crypto price:"), error);
    return -1;
  }
};

export const handleGetCryptoPrice = async (
  req: express.Request<unknown, unknown, RequestCryptoPrice>,
  res: express.Response<ResponseCryptoPrice>,
) => {
  const { cryptoId, currency } = req.body || {};

  if (!cryptoId || !currency) {
    return sendResponse(
      res,
      "BAD_REQUEST",
      { error: "Missing cryptoId or currency" },
      "/cryptoPrice",
    );
  }

  try {
    const priceUSD = await getCryptoPrice(cryptoId, currency);
    const priceUSDTMXN = await getCryptoPrice("USDT", "MXN");
    if (priceUSD === -1 || priceUSDTMXN === -1)
      return sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { error: "Error fetching crypto price" },
        "/cryptoPrice",
      );

    sendResponse(res, "SUCCESS", { priceUSD, priceUSDTMXN }, "/cryptoPrice");
  } catch (error) {
    console.error(chalk.red("Error fetching crypto price:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { error: "Error fetching crypto price" },
      "/cryptoPrice",
    );
  }
};

export const handleGetCryptos = async (
  req: express.Request<unknown, unknown, RequestCryptos>,
  res: express.Response<ResponseCryptos>,
) => {
  try {
    const cryptosFilteredByCurrency = dataBinance?.filter((item) =>
      item.symbol.endsWith(req?.body?.currency || ""),
    ) as PriceBinanceAPI;

    sendResponse(
      res,
      "SUCCESS",
      { cryptos: cryptosFilteredByCurrency || [] },
      "/cryptos",
    );
  } catch (error) {
    console.error(chalk.red("Error fetching cryptos:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { error: "Error fetching cryptos" },
      "/cryptos",
    );
  }
};
