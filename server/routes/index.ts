import "../Notifications/index.ts"; 

import {
  decryptHandler,
  encryptHandler,
  handleGetRandomUUID,
} from "./encryption.ts";
import {
  handleUpdateToSupabase,
  handleInsertToSupabase,
  handleFetchFromSupabase,
  handleDeleteFromSupabase,
} from "./supabase.ts";
import {
  handleLogin,
  handleSignIn,
  handleSignOut,
  authMiddleware,
  handleRefreshSession,
} from "./auth.ts";
import { Router } from "express";
import { translate } from "./translate.ts";
import type { Response, Request } from "express";
import { addStreamer, getIsLiveStreamer } from "./socialMedia.ts";
import type { ResponseHealth, Route, RoutesAPI } from "../../types/typesAPI.ts";
import { handleGetCryptoPrice, handleGetCryptos } from "./cryptos.ts";

const handleHealthCheck = (_: Request, res: Response<ResponseHealth>) => {
  res
    .status(200)
    .json({ status: "running", timestamp: new Date().toISOString() });
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
  "/supabase/fetch": {
    method: "post",
    handler: handleFetchFromSupabase,
    middlewares: [authMiddleware],
  },
  "/supabase/insert": {
    method: "post",
    handler: handleInsertToSupabase,
    middlewares: [authMiddleware],
  },
  "/supabase/update": {
    method: "post",
    handler: handleUpdateToSupabase,
    middlewares: [authMiddleware],
  },
  "/supabase/delete": {
    method: "post",
    handler: handleDeleteFromSupabase,
    middlewares: [authMiddleware],
  },
  "/getRandomUUID": {
    method: "post",
    handler: handleGetRandomUUID,
  },
};

Object.entries(routes).forEach(([path, route]) => {
  if (route.middlewares?.length)
    router[route.method](path, ...route.middlewares, route.handler);
  else router[route.method](path, route.handler);
});

export default router;
