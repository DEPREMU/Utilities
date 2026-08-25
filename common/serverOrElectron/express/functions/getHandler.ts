import { z, ZodError } from "zod";
import chalk from "chalk";
import { Logger } from "@commonSrc/serverOrElectron/logger";
import { SCHEMAS } from "../middlewares/schemas";
import { sendResponse } from "./common";
import { Helper, STATUS_RESPONSE } from "@commonSrc/both";
import type {
  Delete,
  Get,
  GetHandlerType,
  MethodsAPI,
  Post,
  Put,
} from "@types";

export const getHandlerGet: GetHandlerType<Get, "GET"> = (
  path,
  url,
  callback,
) => {
  return async (req, res, next) => {
    try {
      const method = req.method.toUpperCase() as MethodsAPI;

      const schema =
        SCHEMAS[method as "GET"][
          (path + url) as "/clipboard/:deviceId{/:page}"
        ];

      const parsedKeys = await Promise.all(
        Helper.Object.keys(schema).map(async (key) => {
          if (!req[key]) req[key] = {};

          if (!schema[key]) return [key, req[key]];

          return [key, await z.parseAsync(z.object(schema[key]), req[key])];
        }),
      );

      const result = Object.fromEntries(parsedKeys);

      await callback(
        result as never,
        (status, message) => sendResponse(res, status, message),
        { req: req as never, next, res: res as never },
      );
    } catch (error) {
      if (error instanceof ZodError) {
        sendResponse(res, STATUS_RESPONSE.BAD_REQUEST, {
          error: z.treeifyError(error),
        });

        return;
      }

      const statusCode =
        error instanceof Error &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : STATUS_RESPONSE.INTERNAL_SERVER_ERROR;

      Logger.error(chalk.red(`Error processing request: ${path}${url}`), error);
      sendResponse(res, statusCode, {
        success: false,
        error:
          statusCode !== STATUS_RESPONSE.INTERNAL_SERVER_ERROR &&
          error instanceof Error
            ? error.message
            : "An error occurred while processing the request.",
      });
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
