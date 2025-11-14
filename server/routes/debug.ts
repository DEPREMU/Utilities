import { RequestLogs, ResponseLogs } from "@types";
import { insertIntoTable } from "database/functions";
import { Request, Response } from "express";

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
    const { log } = req.body;
    await insertIntoTable("Logs", log);
    success = true;
  } catch (error) {
    console.error("Error adding log:", error);
  }

  res.status(200).json({ success });
};
