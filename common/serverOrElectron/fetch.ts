import chalk from "chalk";
import { Logger } from "./logger.ts";
import type { Response } from "express";
import { STATUS_RESPONSE } from "../both/network.ts";
import type { RoutesAPI, FetchAPI } from "@types";

export const sendResponse = <T extends RoutesAPI>(
  res: Response,
  status: keyof typeof STATUS_RESPONSE = "SUCCESS",
  message: Extract<FetchAPI, { url: T }>["response"],
  _: T,
) => {
  try {
    res.status(STATUS_RESPONSE[status]).json(message);
  } catch (err) {
    Logger.error(
      chalk.red("Error sending response:"),
      chalk.yellow(JSON.stringify(message || {})),
      err instanceof Error ? err.message : String(err),
    );
  }
};
