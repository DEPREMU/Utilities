import chalk from "chalk";
import { Logger } from "@commonSrc/serverOrElectron/logger";
import { STATUS_RESPONSE } from "@commonSrc/both";
import { getBodyParsed, sendResponse } from "./common";
import type { Delete, Get, GetHandlerType, Post, Put } from "@types";

export const getHandlerGet: GetHandlerType<Get, "GET"> = (
  path,
  url,
  keys,
  callback,
) => {
  return async (req, res, next) => {
    try {
      const body = getBodyParsed(keys as never, { req, res });
      if (!body) return;

      await callback(
        body as never,
        (status, message) => sendResponse(res, status, message),
        { req: req as never, next, res: res as never },
      );
    } catch (error) {
      Logger.error(chalk.red(`Error processing request: ${path}${url}`), error);
      sendResponse(res, STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        success: false,
        error: "An error occurred while processing the request.",
      } as never);
    }
  };
};

export const getHandlerDelete = getHandlerGet as unknown as GetHandlerType<
  Delete,
  "DELETE"
>;

export const getHandlerPost = getHandlerGet as unknown as GetHandlerType<
  Post,
  "POST"
>;

export const getHandlerPut = getHandlerGet as unknown as GetHandlerType<
  Put,
  "PUT"
>;
