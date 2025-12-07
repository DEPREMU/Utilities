import type { Response } from "express";
import type { RoutesAPI, FetchAPI } from "@types";
import chalk from "chalk";

export const STATUS_RESPONSE = {
  SUCCESS: 200,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const sendResponse = <T extends RoutesAPI>(
  res: Response,
  status: keyof typeof STATUS_RESPONSE = "SUCCESS",
  message: Extract<FetchAPI, { url: T }>["response"],
  _: T,
) => {
  try {
    res.status(STATUS_RESPONSE[status]).json(message);
  } catch (err) {
    console.error(
      chalk.red("Error sending response:"),
      chalk.yellow(JSON.stringify(message || {})),
      err instanceof Error ? err.message : String(err),
    );
  }
};
