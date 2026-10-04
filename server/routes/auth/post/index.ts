import {
  handleLogin,
  handleSignIn,
  handleSignOut,
  handleVerifyCode,
  handleRequestCode,
  handleRefreshSession,
} from "./handlers";
import { getRouterPost } from "@common";
import { authMiddlewarePost } from "../middlewares";

export const routerAuthPost = getRouterPost("/auth", {
  "/login": { handler: handleLogin },
  "/signup": { handler: handleSignIn },
  "/signout": { handler: handleSignOut, middlewares: [authMiddlewarePost] },
  "/verify-code": { handler: handleVerifyCode },
  "/request-code": { handler: handleRequestCode },
  "/refreshSession": {
    handler: handleRefreshSession,
    middlewares: [authMiddlewarePost],
  },
});
