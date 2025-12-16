import express from "express";
import handleSendWebPage from "./web-page/handleSendWebPage.ts";
import { handleDownload } from "./tempDownloadUrl.ts";
import { handleUploadUpdate } from "./uploadUpdate.ts";
import { Route, UpdatesRoutes } from "@types";
import { handleIsUpdateAvailable } from "./isUpdateAvailable.ts";

const router = express.Router();

type Routes = Record<UpdatesRoutes, Route<UpdatesRoutes>>;

const routes: Routes = {
  "/is-update-available": {
    method: "post",
    handler: handleIsUpdateAvailable,
  },
  "/download/:buildType/:version/:platformOS/:id": {
    method: "get",
    handler: handleDownload,
  },
  "/upload-update": {
    method: "post",
    handler: handleUploadUpdate,
  },
  "/web-page": {
    method: "get",
    handler: handleSendWebPage,
  },
};

Object.entries(routes).forEach(([path, route]) => {
  const middlewares = route.middlewares || [];
  try {
    router[route.method](path, ...middlewares, route.handler);
  } catch (error) {
    console.log(`Error setting up route ${path}:`, error);
    throw new Error(
      `Error setting up route ${path}` +
        (error instanceof Error ? error.message : error),
    );
  }
});

export default router;
