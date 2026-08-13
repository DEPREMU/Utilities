import { Logger } from "@commonSrc/serverOrElectron/logger";
import { TypeOfJS } from "@types";
import { Request, Response } from "express";
import { Helper, STATUS_RESPONSE } from "@commonSrc/both";
import { TypesOfValue } from "@commonSrc/both/helpers/Object";

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

type GetBodyParsedReturn = {
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
};

export const getBodyParsed = (
  keys: Partial<
    Record<
      "params" | "query" | "body",
      Record<string, TypesOfValue | TypesOfValue[]>
    >
  >,
  {
    req,
    res,
  }: {
    req: Request;
    res: Response;
  },
): GetBodyParsedReturn | null => {
  const parsedValues: GetBodyParsedReturn & { invalid?: true } = {
    body: {},
    query: {},
    params: {},
  };

  for (const key of ["params", "query", "body"] as const) {
    if (!(key in keys)) continue;

    try {
      if (typeof keys[key] !== "object" || keys[key] === null) {
        parsedValues.invalid = true;
      } else {
        parsedValues[key] = Helper.Object.changeType(
          { ...(req[key] || {}) },
          keys[key],
        );
      }
    } catch {
      parsedValues.invalid = true;
    }

    if (parsedValues.invalid) {
      sendResponse(res, STATUS_RESPONSE.BAD_REQUEST, {
        error: `Invalid "${key}" parameters.`,
        success: false,
      });
      return null;
    }
  }

  return parsedValues as Omit<Required<typeof parsedValues>, "invalid">;
};
