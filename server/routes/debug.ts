import { sendResponse } from "../variables.ts";
import { insertIntoTable } from "database/functions";
import { Request, Response } from "express";
import { RequestLogs, ResponseLogs } from "@types";

/**
 * Handles adding a log entry to the database.
 * @param req - The request object containing the log entry.
 * @param res - The response object indicating success or failure.
 */
export const handleAddLog = async (
  req: Request<unknown, unknown, RequestLogs>,
  res: Response<ResponseLogs>,
) => {
  let success = false;

  try {
    const { log } = req.body || {};
    if (log) {
      const { error } = await insertIntoTable("Logs", log);
      success = !error;
    }
  } catch (error) {
    console.error("Error adding log:", error);
  }
  sendResponse(res, "SUCCESS", { success }, "/log");
};
