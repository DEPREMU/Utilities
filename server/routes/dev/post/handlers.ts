import chalk from "chalk";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/database/postgres.ts";
import { ResponseDoQuery } from "@types";
import { Logger, STATUS_RESPONSE, getHandlerPost, REPLACERS } from "@common";

export const handleExecuteQuery = getHandlerPost(
  "/dev",
  "/executeQuery",
  {
    body: {
      value: "string",
      showFields: ["boolean", "undefined"],
    },
  },
  async ({ body }, sendResponse) => {
    if (!REPLACERS.isDev) {
      sendResponse(STATUS_RESPONSE.FORBIDDEN, {
        success: false,
        error: "Not available",
      });
      return;
    }

    try {
      const { value: query, showFields = false } = body;

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

        sendResponse(STATUS_RESPONSE.SUCCESS, {
          success: true,
          result: data,
        });
      } catch (error) {
        Logger.error(chalk.red("Error executing query:"), error);
        sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
          success: false,
          error: `Error executing query: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    } catch (error) {
      Logger.error(chalk.red("Error connecting to database:"), error);
      sendResponse(STATUS_RESPONSE.INTERNAL_SERVER_ERROR, {
        success: false,
        error: `Error connecting to database: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  },
);
