import chalk from "chalk";
import type { Request, Response } from "express";
import type { RequestBody, RoutesAPI } from "@types";
import { Logger, sendResponse as sendResponseType } from "@common";

type TypeOf = {
  string: string;
  number: number;
  bigint: bigint;
  symbol: symbol;
  object: object;
  boolean: boolean;
  function: () => unknown;
  undefined: undefined;
};

type GetHandlerPost = {
  <
    T extends RoutesAPI<"post">,
    U extends { [P in keyof K]?: keyof TypeOf | (keyof TypeOf)[] },
    K extends RequestBody<T>,
    B extends {
      [P in keyof K]:
        | Exclude<K[P], undefined | null>
        | (U[P] extends (keyof TypeOf)[]
            ? TypeOf[U[P][number]]
            : U[P] extends keyof TypeOf
              ? TypeOf[U[P]]
              : never);
    },
  >(
    path: T,
    keys: U,
    callback: (
      body: B,
      sendResponse: (
        status: Parameters<typeof sendResponseType<T>>[1],
        data: Parameters<typeof sendResponseType<T>>[2],
      ) => void,
      req: Request<unknown, unknown, K>,
    ) => void | Promise<void>,
  ): (req: Request<unknown, unknown, K>, res: Response) => Promise<void>;
};

const isValidValue = (
  value: unknown,
  expectedTypes: (keyof TypeOf)[],
): boolean => {
  Logger.log("Validating value:", value, "against types:", expectedTypes);
  for (const type of expectedTypes) {
    switch (type) {
      case "bigint":
        if (typeof value === "bigint") return true;
        break;
      case "boolean":
        if (typeof value === "boolean") return true;
        break;
      case "function":
        if (typeof value === "function") return true;
        break;
      case "number":
        if (typeof value === "number" && !isNaN(value)) return true;
        break;
      case "object":
        if (typeof value === "object" && value !== null) {
          if (Array.isArray(value) && value.length > 0) return true;
          if (!Array.isArray(value) && Object.keys(value).length > 0)
            return true;
        }
        break;
      case "string":
        if (typeof value === "string" && value.length > 0) return true;
        break;
      case "symbol":
        if (typeof value === "symbol") return true;
        break;
      case "undefined":
        if (typeof value === "undefined") return true;
        break;
      default:
        break;
    }
  }
  return false;
};

export const getHandlerPost: GetHandlerPost = (path, keys, callback) => {
  return async (req, res) => {
    try {
      const body: Record<string, unknown> = req.body || {};
      for (const key in keys) {
        const expectedType = keys[key];
        if (!expectedType) continue;

        const expectedTypes = Array.isArray(expectedType)
          ? expectedType
          : [expectedType];

        if (isValidValue(body[key], expectedTypes as never)) continue;

        sendResponseType(
          res,
          "BAD_REQUEST",
          {
            success: false,
            error: `Invalid type for ${key}. Expected ${keys[key]}.`,
          } as never,
          path,
        );
        return;
      }
      await callback(
        body as never,
        (status, data) => sendResponseType(res, status, data, path),
        req as never,
      );
    } catch (error) {
      Logger.error(chalk.red("Error processing request:"), error);
      sendResponseType(
        res,
        "INTERNAL_SERVER_ERROR",
        {
          success: false,
          error: "An error occurred while processing the request.",
        } as never,
        path,
      );
    }
  };
};
