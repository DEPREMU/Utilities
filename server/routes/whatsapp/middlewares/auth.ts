import chalk from "chalk";
import { JWT } from "@/routes/auth/variables";
import { Request, Response, NextFunction } from "express";
import { Logger, RequestError, STATUS_RESPONSE } from "@common";

const logger = new Logger("WhatsAppAuthMiddleware");

export const whatsappAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers?.authorization;
  if (!authHeader) {
    throw new RequestError(
      STATUS_RESPONSE.UNAUTHORIZED,
      "Authorization header missing",
    );
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new RequestError(
      STATUS_RESPONSE.UNAUTHORIZED,
      "Invalid authorization format",
    );
  }

  let tokenInstance: JWT;
  try {
    tokenInstance = new JWT({ token });
  } catch (error) {
    logger.error(
      chalk.red("Error verifying JWT token for WhatsApp route:"),
      error,
    );
    throw new RequestError(
      STATUS_RESPONSE.UNAUTHORIZED,
      "Invalid or expired token",
    );
  }

  req.user = { token: tokenInstance };
  next();
};
