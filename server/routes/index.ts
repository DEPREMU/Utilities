import "../Notifications/index.ts";

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
import humanize from "humanize-duration";
import { Router } from "express";
import { REPLACERS } from "@/config.ts";
import { translate } from "./translate.ts";
import { Response, Request } from "express";
import { decryptHandler, encryptHandler } from "./encryption.ts";
import { addStreamer, getIsLiveStreamer } from "./socialMedia.ts";
import { handleAddLog, handleAppAliveCheck } from "./debug.ts";
import { handleGetCryptoPrice, handleGetCryptos } from "./cryptos.ts";
import { ResponseHealth, Route, RoutesAPI, UpdatesRoutes } from "@types";
import { handleChangeImageFormat, readImage, sendResponse } from "@common";

if (typeof handleChangeImageFormat !== "function")
  throw new Error("handleChangeImageFormat is undefined");
if (typeof sendResponse !== "function")
  throw new Error("sendResponse is undefined");
if (typeof readImage !== "function") throw new Error("readImage is undefined");

const startTime = Date.now();
const handleHealthCheck = (_: Request, res: Response<ResponseHealth>) => {
  const uptime = Date.now() - startTime;
  const uptimeString = humanize(uptime, {
    largest: 2,
    round: true,
  });

  res.status(200).json({
    status: "running",
    uptime: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    uptimeString,
  });
};

const handleGenerate204 = (_: Request, res: Response) => {
  res.status(204).send();
};

const router = Router();

const doQueryImport = REPLACERS.isDev
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("@/dev/handleDoQuery.ts") as typeof import("@/dev/handleDoQuery.ts"))
  : ({
      handleDoQueryDatabase: handleGenerate204 as never,
    } satisfies typeof import("@/dev/handleDoQuery.ts"));

const routes: {
  [K in Exclude<RoutesAPI, UpdatesRoutes>]: Route<K>;
} = {
  "/cryptoPrice": {
    method: "post",
    handler: handleGetCryptoPrice,
  },
  "/cryptos": {
    method: "post",
    handler: handleGetCryptos,
  },
  "/generate204": {
    method: "get",
    handler: handleGenerate204,
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
    method: "put",
    handler: handleUpdateToDatabase,
    middlewares: [authMiddleware],
  },
  "/database/delete": {
    method: "post",
    handler: handleDeleteFromDatabase,
    middlewares: [authMiddleware],
  },
  "/doQueryDB": {
    method: "post",
    handler: doQueryImport.handleDoQueryDatabase,
  },
  "/log": {
    method: "post",
    handler: handleAddLog,
  },
  "/images/changeImageFormat": {
    method: "post",
    handler: handleChangeImageFormat,
  },
  "/debug/appAlive": {
    method: "post",
    handler: handleAppAliveCheck,
  },
};

Object.entries(routes).forEach(([path, route]) => {
  try {
    if (route.middlewares?.length)
      router[route.method](path, ...route.middlewares, route.handler);
    else router[route.method](path, route.handler);
  } catch (err) {
    throw new Error(
      `Error setting up route ${path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
});

export default router;
