import {
  handleLogin,
  handleSignIn,
  handleSignOut,
  handleRefreshSession,
} from "./handlers";
import { getRouterPost } from "@/routes/common";
import { authMiddleware } from "../middlewares";

export const routerAuthPost = getRouterPost("/auth", {
  "/login": { handler: handleLogin },
  "/signup": { handler: handleSignIn },
  "/signout": { handler: handleSignOut, middlewares: [authMiddleware] },
  "/refreshSession": {
    handler: handleRefreshSession,
    middlewares: [authMiddleware],
  },
});
