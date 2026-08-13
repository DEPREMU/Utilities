import {
  handleLogin,
  handleSignIn,
  handleSignOut,
  handleRefreshSession,
} from "./handlers";
import { getRouterPost } from "@common";
import { authMiddlewarePost } from "../middlewares";

export const routerAuthPost = getRouterPost("/auth", {
  "/login": { handler: handleLogin },
  "/signup": { handler: handleSignIn },
  "/signout": { handler: handleSignOut, middlewares: [authMiddlewarePost] },
  "/refreshSession": {
    handler: handleRefreshSession,
    middlewares: [authMiddlewarePost],
  },
});
