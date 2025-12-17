import env from "../env.ts";
import chalk from "chalk";
import { pool } from "../database/postgres.ts";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import { ResponseDoQuery } from "@types";

export const handleDoQueryDatabase = getHandlerPost(
  "/doQueryDB",
  {
    query: "string",
    showFields: ["boolean", "undefined"],
  },
  async (body, sendResponse) => {
    if (!["1", "true"].includes(env.__DEV__)) {
      sendResponse("FORBIDDEN", { success: false, error: "Not available" });
      return;
    }

    try {
      const { query, showFields } = body;

      const client = await pool.connect();
      try {
        const result = await client.query(query);
        const data: ResponseDoQuery["result"] = {
          rowCount: result.rowCount || 0,
          rows: result.rows || [],
          command: result.command || query,
          fields: showFields ? result.fields : undefined,
        };

        sendResponse("SUCCESS", {
          success: true,
          result: data,
        });
      } catch (error) {
        console.error(
          chalk.red("Error executing query:"),
          error instanceof Error ? error.message : error,
        );
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: `Error executing query: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(chalk.red("Error connecting to database:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: `Error connecting to database: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  },
);
