import chalk from "chalk";
import { Logger } from "@common";
import type { Get, GetHandlerType } from "@types";
import { getBodyParsed, sendResponse } from "./common";

export const getHandlerGet: GetHandlerType<Get, "GET"> = (
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
      sendResponse(res, "INTERNAL_SERVER_ERROR", {
        success: false,
        error: "An error occurred while processing the request.",
      } as never);
    }
  };
};
