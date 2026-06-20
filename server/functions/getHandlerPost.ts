import chalk from "chalk";
import { Logger } from "@common";
import type { GetHandlerType, Post } from "@types";
import { getBodyParsed, sendResponse } from "./common";

export const getHandlerPost: GetHandlerType<Post, "POST"> = (
  _path,
  _url,
  keys,
  callback,
) => {
  return async (req, res, next) => {
    try {
      const body = getBodyParsed(keys as never, { req, res });
      if (!body) return;

      await callback(
        body as never,
        (status, data) => sendResponse(res, status, data),
        { req, next, res },
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
