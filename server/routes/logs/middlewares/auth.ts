import chalk from "chalk";
import { JWT } from "@/routes/auth/variables";
import { Logger, STATUS_RESPONSE, getHandlerGet } from "@common";
import { RequestError } from "@commonSrc/both/errors/Error";

export const authMiddleware = getHandlerGet(
  "/logs",
  "/",
  async (_, _sendResponse, { req, next }) => {
    const authHeader = req.headers?.authorization;
    if (!authHeader)
      throw new RequestError(
        STATUS_RESPONSE.UNAUTHORIZED,
        "Authorization header missing",
      );

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token)
      throw new RequestError(
        STATUS_RESPONSE.UNAUTHORIZED,
        "Invalid authorization format",
      );

    let tokenInstance: JWT;

    try {
      tokenInstance = new JWT({ token });
    } catch (error) {
      Logger.error(chalk.red("Error verifying JWT token:"), error);
      throw new RequestError(
        STATUS_RESPONSE.UNAUTHORIZED,
        "Invalid or expired token",
      );
    }

    req.user = { token: tokenInstance };
    next();
  },
);
