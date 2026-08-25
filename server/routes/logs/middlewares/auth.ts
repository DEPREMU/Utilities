import chalk from "chalk";
import { JWT } from "@/routes/auth/variables";
import { Logger, STATUS_RESPONSE, getHandlerGet } from "@common";

export const authMiddleware = getHandlerGet(
  "/logs",
  "/",
  async (_, sendResponse, { req, next }) => {
    try {
      const authHeader = req.headers?.authorization;
      if (!authHeader) {
        sendResponse(STATUS_RESPONSE.UNAUTHORIZED, {
          error: "Authorization header missing",
        });
        return;
      }

      const [scheme, token] = authHeader.split(" ");
      if (scheme !== "Bearer" || !token) {
        sendResponse(STATUS_RESPONSE.UNAUTHORIZED, {
          error: "Invalid authorization format",
        });
        return;
      }

      let tokenInstance: JWT;

      try {
        tokenInstance = new JWT({ token });
      } catch (error) {
        Logger.error(chalk.red("Error verifying JWT token:"), error);
        sendResponse(STATUS_RESPONSE.UNAUTHORIZED, {
          error: "Invalid or expired token",
        });
        return;
      }

      req.user = { token: tokenInstance };
      next();
    } catch (err) {
      Logger.error(chalk.red("Error in auth middleware:"), err);
      sendResponse(STATUS_RESPONSE.UNAUTHORIZED, {
        error: "Unknown error occurred during authentication",
      });
    }
  },
);
