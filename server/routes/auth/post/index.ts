import {
  handleLogin,
  handleSignIn,
  handleSignOut,
  handleVerifyCode,
  handleRequestCode,
  handleRefreshSession,
  handleForgotPasswordReset,
  handleForgotPasswordVerify,
  handleForgotPasswordRequest,
} from "./handlers";
import { getRouterPost } from "@common";
import { authMiddlewarePost } from "../middlewares";

export const routerAuthPost = getRouterPost("/auth", {
  "/login": { handler: handleLogin },
  "/signup": { handler: handleSignIn },
  "/signout": { handler: handleSignOut, middlewares: [authMiddlewarePost] },
  "/verify-code": { handler: handleVerifyCode },
  "/request-code": { handler: handleRequestCode },
  "/forgot-password/reset": { handler: handleForgotPasswordReset },
  "/forgot-password/verify": { handler: handleForgotPasswordVerify },
  "/forgot-password/request": { handler: handleForgotPasswordRequest },
  "/refreshSession": {
    handler: handleRefreshSession,
    middlewares: [authMiddlewarePost],
  },
});
