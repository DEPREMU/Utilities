import { Logger } from "@commonSrc/serverOrElectron/logger";
import { Response } from "express";
import { STATUS_RESPONSE } from "@commonSrc/both";

const logger = new Logger("ExpressCommon");

export const sendResponse = (
  res: Response,
  status: STATUS_RESPONSE,
  message: unknown,
) => {
  try {
    if (typeof message === "object" && message !== null)
      res.status(status).json(message);
    else res.status(status).send(message);
  } catch (error) {
    logger.error("Error while sending response:", error);
  }
};
