import "../Notifications/index.ts";

import {
  decryptHandler,
  encryptHandler,
  handleGetRandomUUID,
} from "./encryption.ts";
import {
  handleUpdateToDatabase,
  handleInsertToDatabase,
  handleFetchFromDatabase,
  handleDeleteFromDatabase,
} from "./database.ts";
import {
  handleLogin,
  handleSignIn,
  handleSignOut,
  authMiddleware,
  handleRefreshSession,
} from "./auth.ts";
import { Router } from "express";
import { translate } from "./translate.ts";
import { handleAddLog } from "./debug.ts";
import { Response, Request } from "express";
import { handleDoQueryDatabase } from "../dev/handleDoQuery.ts";
import { addStreamer, getIsLiveStreamer } from "./socialMedia.ts";
import { ResponseHealth, Route, RoutesAPI } from "@types";
import { handleGetCryptoPrice, handleGetCryptos } from "./cryptos.ts";

const startTime = Date.now();
const handleHealthCheck = (_: Request, res: Response<ResponseHealth>) => {
  res.status(200).json({
    status: "running",
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
  });
};

const router = Router();

const routes: Record<RoutesAPI, Route> = {
  "/cryptoPrice": {
    method: "post",
    handler: handleGetCryptoPrice,
  },
  "/cryptos": {
    method: "post",
    handler: handleGetCryptos,
  },
  "/translate": {
    method: "post",
    handler: translate,
  },
  "/encrypt": {
    method: "post",
    handler: encryptHandler,
  },
  "/decrypt": {
    method: "post",
    handler: decryptHandler,
  },
  "/health": {
    method: "get",
    handler: handleHealthCheck,
  },
  "/addStreamer": {
    method: "post",
    handler: addStreamer,
  },
  "/getIsLiveStreamer": {
    method: "post",
    handler: getIsLiveStreamer,
  },
  "/auth/login": {
    method: "post",
    handler: handleLogin,
  },
  "/auth/signup": {
    method: "post",
    handler: handleSignIn,
  },
  "/auth/refreshSession": {
    method: "post",
    handler: handleRefreshSession,
    middlewares: [authMiddleware],
  },
  "/auth/signOut": {
    method: "post",
    handler: handleSignOut,
    middlewares: [authMiddleware],
  },
  "/database/fetch": {
    method: "post",
    handler: handleFetchFromDatabase,
    middlewares: [authMiddleware],
  },
  "/database/insert": {
    method: "post",
    handler: handleInsertToDatabase,
    middlewares: [authMiddleware],
  },
  "/database/update": {
    method: "post",
    handler: handleUpdateToDatabase,
    middlewares: [authMiddleware],
  },
  "/database/delete": {
    method: "post",
    handler: handleDeleteFromDatabase,
    middlewares: [authMiddleware],
  },
  "/getRandomUUID": {
    method: "post",
    handler: handleGetRandomUUID,
  },
  "/doQueryDB": {
    method: "post",
    handler: handleDoQueryDatabase,
  },
  "/log": {
    method: "post",
    handler: handleAddLog,
  },
};

Object.entries(routes).forEach(([path, route]) => {
  try {
    if (route.middlewares?.length)
      router[route.method](path, ...route.middlewares, route.handler);
    else router[route.method](path, route.handler);
  } catch (err) {
    throw new Error(`Error setting up route ${path}: ${String(err)}`);
  }
});

export default router;
