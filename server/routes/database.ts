import {
  deleteInTable,
  updateInTable,
  fetchFromTable,
  insertIntoTable,
} from "../database/functions.ts";
import {
  RequestDatabaseDelete,
  RequestDatabaseFetch,
  RequestDatabaseInsert,
  RequestDatabaseUpdate,
  ResponseDatabaseUpdate,
} from "@types";
import chalk from "chalk";
import { TABLE_MAP } from "../config.ts";
import { getHandlerPost } from "../functions/getHandlerPost.ts";
import type { Request, Response } from "express";
import { t, Logger, sendResponse } from "@common";

export const handleFetchFromDatabase = getHandlerPost(
  "/database/fetch",
  {
    table: "string",
    match: ["object", "undefined"],
    pagination: ["boolean", "undefined"],
    limit: ["number", "undefined"],
    offset: ["number", "undefined"],
    orderBy: ["string", "undefined"],
    orderDirection: ["string", "undefined"],
    search: ["string", "undefined"],
    columnsToSearch: ["object", "string", "undefined"],
    lang: ["string", "undefined"],
  },
  async (body, sendResponse, req) => {
    const requestBody = body as RequestDatabaseFetch;
    const lang = requestBody?.lang || "en";
    let { match } = requestBody;

    try {
      const { table } = requestBody;
      const { tokenDecoded: decode } = req.user || {};

      if (!table || !TABLE_MAP[table])
        return sendResponse("BAD_REQUEST", {
          success: false,
          error: t("database.invalidBody", lang),
        });

      if (!match) match = { userId: decode.userId };
      else {
        if (match.userId && match.userId !== decode.userId) {
          return sendResponse("UNAUTHORIZED", {
            success: false,
            error: t("auth.unauthorized", lang),
          });
        }
      }

      const options: Record<string, unknown> = {};
      if (requestBody.pagination) {
        if (typeof requestBody.limit === "number" && requestBody.limit > 0)
          options.limit = requestBody.limit;
        if (typeof requestBody.offset === "number" && requestBody.offset >= 0)
          options.offset = requestBody.offset;
        if (requestBody.orderBy) options.orderBy = requestBody.orderBy;
        if (requestBody.orderDirection)
          options.orderDirection = requestBody.orderDirection;
      }

      if (requestBody.search && requestBody.columnsToSearch) {
        const columnsToSearch = requestBody.columnsToSearch;

        const searchColumns = Array.isArray(columnsToSearch)
          ? columnsToSearch
          : [columnsToSearch];

        options.search = requestBody.search;
        options.columnsToSearch = searchColumns;
      }

      const { data, error } = await fetchFromTable({
        table,
        match,
        ...options,
      });

      if (error) {
        Logger.error(chalk.red("Error fetching from Database:"), error);
        return sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("database.fetchError", lang),
        });
      }

      sendResponse("SUCCESS", { success: true, data: data || [] });
    } catch (error) {
      Logger.error(chalk.red("Error fetching from Database:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: t("database.fetchError", lang),
      });
    }
  },
);

export const handleInsertToDatabase = getHandlerPost(
  "/database/insert",
  {
    table: "string",
    values: "object",
    lang: ["string", "undefined"],
  },
  async (body, sendResponse, req) => {
    const requestBody = body as RequestDatabaseInsert;
    const lang = requestBody?.lang || "en";

    try {
      const { table, values } = requestBody;
      const { token, tokenDecoded: decode } = req.user || {};

      if (!table || !TABLE_MAP[table] || !values)
        return sendResponse("BAD_REQUEST", {
          error: t("database.invalidBody", lang),
          success: false,
        });

      const { data: usersSessions } = await fetchFromTable({
        table: "UserSessions",
        match: { userId: decode.userId, token },
      });
      if (!usersSessions || usersSessions.length === 0)
        return sendResponse("UNAUTHORIZED", {
          success: false,
          error: t("auth.sessionNotFound", lang),
        });

      const { data, error } = await insertIntoTable(table, values);
      if (error)
        return sendResponse("INTERNAL_SERVER_ERROR", {
          error: t("database.insertError", lang),
          success: false,
        });

      sendResponse("SUCCESS", { success: true, data });
    } catch (error) {
      Logger.error(chalk.red("Error inserting to Database:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: t("database.insertError", lang),
      });
    }
  },
);

export const handleUpdateToDatabase = async (
  req: Request<unknown, unknown, RequestDatabaseUpdate>,
  res: Response<ResponseDatabaseUpdate>,
) => {
  const lang = req.body?.lang || "en";

  try {
    let { match } = req.body || {};
    const { tokenDecoded: decode } = req.user || {};
    const { table, values } = req.body || {};

    if (!table || !TABLE_MAP[table] || !values)
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: t("database.invalidBody", lang), success: false },
        "/database/update",
      );

    if (!match) match = { userId: decode.userId };
    else {
      if (match.userId && match.userId !== decode.userId) {
        return sendResponse(
          res,
          "UNAUTHORIZED",
          { success: false, error: t("auth.unauthorized", lang) },
          "/database/update",
        );
      }
    }

    const { data, error } = await updateInTable(table, values, match);
    if (error)
      return sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { success: false, error: t("database.updateError", lang) },
        "/database/update",
      );

    sendResponse(res, "SUCCESS", { success: true, data }, "/database/update");
  } catch (error) {
    Logger.error(chalk.red("Error updating Database:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { success: false, error: t("database.updateError", lang) },
      "/database/update",
    );
  }
};

export const handleDeleteFromDatabase = getHandlerPost(
  "/database/delete",
  {
    table: "string",
    match: ["object", "undefined"],
    lang: ["string", "undefined"],
  },
  async (body, sendResponse, req) => {
    const requestBody = body as RequestDatabaseDelete;
    const lang = requestBody?.lang || "en";

    try {
      const { tokenDecoded: decode } = req.user || {};
      const { table, match = { userId: decode.userId } } = requestBody;

      if (!table || !TABLE_MAP[table])
        return sendResponse("BAD_REQUEST", {
          error: t("database.invalidBody", lang),
          success: false,
        });

      if (match.userId && match.userId !== decode.userId) {
        return sendResponse("UNAUTHORIZED", {
          success: false,
          error: t("auth.unauthorized", lang),
        });
      }

      const { success, error } = await deleteInTable(
        decode.userId,
        table,
        match,
      );
      if (error)
        return sendResponse("INTERNAL_SERVER_ERROR", {
          success: false,
          error: t("database.deleteError", lang),
        });

      sendResponse("SUCCESS", { success });
    } catch (error) {
      Logger.error(chalk.red("Error deleting from Database:"), error);
      sendResponse("INTERNAL_SERVER_ERROR", {
        success: false,
        error: t("database.deleteError", lang),
      });
    }
  },
);
