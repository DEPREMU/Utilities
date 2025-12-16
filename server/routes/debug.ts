import { sendResponse } from "@common";
import { insertIntoTable } from "../database/functions.ts";
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
  let error: string | undefined;

  try {
    const log = req.body || null;
    if (log) {
      const { error: insertError } = await insertIntoTable("Logs", log);
      error = insertError || undefined;
      success = !error;
    }
  } catch (error) {
    console.error("Error adding log:", error);
  }
  sendResponse(res, "SUCCESS", { success, error }, "/log");
};
