import chalk from "chalk";
import { Logger } from "@commonSrc/serverOrElectron/logger";
import { STATUS_RESPONSE } from "@commonSrc/both";
import type { GetHandlerType, Put } from "@types";
import { getBodyParsed, sendResponse } from "./common";

export const getHandlerPut: GetHandlerType<Put, "PUT"> = (
  _path,
  _url,
  keys,
  callback,
) => {
  return async (req, res, next) => {
    try {
      const params = getBodyParsed(keys as never, { req, res });
      if (!params) return;

      await callback(
        params as never,
        (status, message) => sendResponse(res, status, message),
        { req: req as never, next, res: res as never },
      );
    } catch (error) {
      Logger.error(chalk.red("Error processing request:"), error);
      sendResponse(res, STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        success: false,
        error: "An error occurred while processing the request.",
      } as never);
    }
  };
};
