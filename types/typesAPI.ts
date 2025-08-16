import type { UserData } from "./typesUser";
import type { Logs } from "./typesDatabase";

export type Route = {
  path: RoutesAPI;
  method: "get" | "post" | "put" | "delete";
  middlewares?: any[];
  handler: any;
};

export type Coin = {
  id: string;
  name: string;
  symbol: string;
};

export type RoutesAPI =
  | "/decrypt"
  | "/encrypt"
  | "/cryptoPrice"
  | "/cryptos"
  | "/health";

export type RequestBody = Logs | UserData;

export type PriceBinanceAPI = {
  symbol: string;
  price: number;
}[];

export type ResponseCryptoPrice = {
  priceUSD?: number;
  priceUSDTMXN?: number;
  error?: string;
};
export type RequestCryptoPrice = {
  cryptoId: string;
  currency: string;
};

export type RequestCryptos = {
  currency?: string;
};

export type ResponseCryptos = {
  cryptos?: PriceBinanceAPI;
  error?: string;
};
