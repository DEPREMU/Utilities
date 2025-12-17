import { RequestLogs } from "@types";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { insertIntoTable } from "../database/functions.ts";

/**
 * Handles adding a log entry to the database.
 * @param req - The request object containing the log entry.
 * @param res - The response object indicating success or failure.
 */
export const handleAddLog = getHandlerPost(
  "/log",
  {},
  async (body, sendResponse) => {
    let success = false;
    let error: string | undefined;

    try {
      const log = (body || null) as RequestLogs | null;
      if (log) {
        const { error: insertError } = await insertIntoTable("Logs", log);
        error = insertError || undefined;
        success = !error;
      }
    } catch (err) {
      console.error("Error adding log:", err);
      error = err instanceof Error ? err.message : String(err);
    }
    sendResponse("SUCCESS", { success });
  },
);
