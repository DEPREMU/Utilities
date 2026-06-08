import chalk from "chalk";
import { Logger } from "@common";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/database/postgres.ts";
import { REPLACERS } from "@/config.ts";
import { getHandlerPost } from "@/functions/getHandlerPost.ts";
import { ResponseDoQuery } from "@types";

export const handleDoQueryDatabase = getHandlerPost(
  "/doQueryDB",
  {
    query: "string",
    showFields: ["boolean", "undefined"],
  },
  async (body, sendResponse) => {
    if (!REPLACERS.isDev) {
      sendResponse("FORBIDDEN", { success: false, error: "Not available" });
      return;
    }

    try {
      const { query, showFields } = body;

      try {
        const result: Record<string, unknown> = await prisma.$queryRaw(
          Prisma.raw(query),
        );
        const data: ResponseDoQuery["result"] = {
          rowCount: typeof result.rowCount === "number" ? result.rowCount : 0,
          rows: Array.isArray(result.rows) ? result.rows : [],
          command: query,
          fields:
            showFields && Array.isArray(result.fields)
              ? result.fields
              : undefined,
        };

        sendResponse("SUCCESS", {
          success: true,
          result: data,
        });
      } catch (error) {
        Logger.error(chalk.red("Error executing query:"), error);
        sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: `Error executing query: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    } catch (error) {
      Logger.error(chalk.red("Error connecting to database:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: `Error connecting to database: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  },
);
