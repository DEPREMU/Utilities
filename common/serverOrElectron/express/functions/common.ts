import { Logger } from "@commonSrc/serverOrElectron/logger";
import { TypeOfJS } from "@types";
import { Request, Response } from "express";
import { Helper, STATUS_RESPONSE } from "@commonSrc/both";

export const isValidValue = (
  value: unknown,
  expectedTypes: (keyof TypeOfJS)[],
): boolean => {
  const set = new Set<keyof TypeOfJS>(expectedTypes);
  Logger.log(
    `Validating value: "${value} - ${typeof value}" against types: ${[...set].join(", ")}`,
  );
  return set.has(typeof value);
};

export const getValidValue = (
  value: unknown,
  expectedTypes: (keyof TypeOfJS)[],
): TypeOfJS[keyof TypeOfJS] | null => {
  for (const expectedType of expectedTypes) {
    switch (expectedType) {
      case "bigint":
        if (typeof value === "bigint") return value;
        else {
          const bigIntValue = BigInt(value as string);
          if (!isNaN(Number(bigIntValue))) return bigIntValue;
        }
        break;

      case "number":
        if (typeof value === "number") return value;
        else {
          const num = Number(value);
          if (!isNaN(num)) return num;
        }
        break;

      case "boolean":
        if (typeof value === "boolean") return value;
        else if (value === "true" || value === "1") return true;
        else if (value === "false" || value === "0") return false;
        break;

      case "function":
        if (typeof value === "function") return value;
        break;

      case "object":
        if (typeof value === "object" && value !== null) return value;
        break;

      case "string":
        if (typeof value === "string") return value;
        break;

      case "symbol":
        if (typeof value === "symbol") return value;
        break;

      case "undefined":
        if (typeof value === "undefined") return value;
        break;

      default:
        break;
    }
  }

  return null;
};

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
    Logger.error("Error while sending response:", error);
  }
};

export const getBodyParsed = (
  keys: Record<string, string | string[]>,
  {
    req,
    res,
  }: {
    req: Request;
    res: Response;
  },
) => {
  const body: Record<string, unknown> = req.body || req.params || {};

  const parsedParams = Helper.Object.fromEntries(
    Helper.Object.entries(keys || {}).map(([key, expectedType]) => {
      const expectedTypes = Array.isArray(expectedType)
        ? expectedType
        : expectedType !== undefined
          ? [expectedType]
          : [];

      if (!expectedType?.length) return [key, body[key as string]];

      const validValue = getValidValue(
        body[key as string],
        expectedTypes as (keyof TypeOfJS)[],
      );

      if (validValue === null) return ["invalid", true];

      return [key, validValue];
    }),
  );

  if (!parsedParams || (parsedParams as { invalid: boolean })["invalid"]) {
    sendResponse(res, STATUS_RESPONSE.BAD_REQUEST, {
      error: "Invalid request parameters.",
      success: false,
    } as never);
    return null;
  }

  return parsedParams;
};
