/* eslint-disable @typescript-eslint/no-require-imports */
import { Router } from "express";
import { REPLACERS, getRouterPerRoute } from "@common";

export const ROUTER_DEV = REPLACERS.isDev
  ? getRouterPerRoute("/dev", {
      POST: (require("./post") as typeof import("./post")).routerDevPost,
    })
  : Router();
