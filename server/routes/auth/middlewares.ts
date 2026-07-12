import chalk from "chalk";
import { JWT } from "./variables.ts";
import { Logger, STATUS_RESPONSE, getHandlerPost } from "@common";

export const authMiddleware = getHandlerPost(
  "/auth",
  "/login",
  { deviceId: "string" },
  async (body, sendResponse, { req, next }) => {
    const response: Parameters<typeof sendResponse>[1] = {
      success: false,
    };

    try {
      const authHeader = req.headers?.authorization;
      if (!authHeader) {
        response.error = "Authorization header missing";
        return;
      }

      const [scheme, token] = authHeader.split(" ");
      if (scheme !== "Bearer" || !token) {
        response.error = "Invalid authorization format";
        return;
      }

      let tokenInstance: JWT;

      try {
        tokenInstance = new JWT({ token });

        if (tokenInstance.data.deviceId !== body.deviceId) {
          response.error = "Forbidden request";
          return;
        }
      } catch (error) {
        Logger.error(chalk.red("Error verifying JWT token:"), error);
        response.error = "Invalid or expired token";
        return;
      }

      req.user = { token: tokenInstance };
      response.success = true;
      next();
    } catch (err) {
      Logger.error(chalk.red("Error in auth middleware:"), err);
      response.error = "Unknown error occurred during authentication";
    } finally {
      if (response.error || !response.success)
        sendResponse(
          response.error
            ? STATUS_RESPONSE.UNAUTHORIZED
            : STATUS_RESPONSE.SUCCESS,
          response,
        );
    }
  },
);
