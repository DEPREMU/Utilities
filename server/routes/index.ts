import { Router } from "express";
import type { Route } from "../../types/typesAPI.ts";
import type { Response, Request } from "express";
import { decryptHandler, encryptHandler } from "./encryption.ts";
import { handleGetCryptoPrice, handleGetCryptos } from "./cryptos.ts";

const handleHealthCheck = (_: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
};

const router = Router();

const routes: Route[] = [
  {
    path: "/cryptoPrice",
    method: "post",
    handler: handleGetCryptoPrice,
  },
  {
    path: "/cryptos",
    method: "post",
    handler: handleGetCryptos,
  },
  {
    path: "/encrypt",
    method: "post",
    handler: encryptHandler,
  },
  {
    path: "/decrypt",
    method: "post",
    handler: decryptHandler,
  },
  {
    path: "/health",
    method: "get",
    handler: handleHealthCheck,
  },
];

routes.forEach((route) => {
  if (route.middlewares?.length)
    router[route.method](route.path, ...route.middlewares, route.handler);
  else router[route.method](route.path, route.handler);
});

export default router;
