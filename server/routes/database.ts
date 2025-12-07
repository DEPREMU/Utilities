import {
  updateInTable,
  deleteInTable,
  fetchFromTable,
  insertIntoTable,
} from "../database/functions.ts";
import {
  TablesKeys,
  RequestDatabaseFetch,
  RequestDatabaseDelete,
  RequestDatabaseInsert,
  RequestDatabaseUpdate,
  ResponseDatabaseFetch,
  ResponseDatabaseDelete,
  ResponseDatabaseInsert,
  ResponseDatabaseUpdate,
} from "@types";
import chalk from "chalk";
import { t } from "../translations/index.ts";
import { TABLE_MAP } from "config.ts";
import { sendResponse } from "../variables.ts";
import { Request, Response } from "express";

export const handleFetchFromDatabase = async (
  req: Request<unknown, unknown, RequestDatabaseFetch>,
  res: Response<ResponseDatabaseFetch<TablesKeys>>,
) => {
  const lang = req?.body?.lang || "en";
  let { match } = req.body || { match: null };
  try {
    const { table } = req.body || {};
    const { tokenDecoded: decode } = req.user || {};

    if (!table || !TABLE_MAP?.[table])
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: t("database.invalidBody", lang) },
        "/database/fetch",
      );

    if (!match) match = { userId: decode.userId };
    const options: Record<string, unknown> = {};
    if ("orderBy" in req.body) {
      if (req.body.limit) options.limit = req.body.limit;
      if (req.body.offset) options.offset = req.body.offset;
      if (req.body.orderBy) options.orderBy = req.body.orderBy;
      if (req.body.orderDirection)
        options.orderDirection = req.body.orderDirection;
    }

    const { data, error } = await fetchFromTable({
      table,
      match,
      ...options,
    });

    if (error) {
      console.error(chalk.red("Error fetching from Database:"), error);
      return sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { error: t("database.fetchError", lang) },
        "/database/fetch",
      );
    }

    sendResponse(res, "SUCCESS", { data: data || null }, "/database/fetch");
  } catch (error) {
    console.error(chalk.red("Error fetching from Database:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { error: t("database.fetchError", lang) },
      "/database/fetch",
    );
  }
};

export const handleInsertToDatabase = async (
  req: Request<unknown, unknown, RequestDatabaseInsert>,
  res: Response<ResponseDatabaseInsert>,
) => {
  const lang = req?.body?.lang || "en";
  try {
    const { table, values } = req.body || {};
    const { token, tokenDecoded: decode } = req.user || {};

    if (!table || !TABLE_MAP?.[table] || !values)
      return sendResponse(
        res,
        "BAD_REQUEST",
        {
          error: t("database.invalidBody", lang),
          success: false,
        },
        "/database/insert",
      );

    const { data: usersSessions } = await fetchFromTable({
      table: "UserSessions",
      match: {
        userId: decode.userId,
        token,
      },
    });
    if (
      !usersSessions ||
      (Array.isArray(usersSessions) && usersSessions.length === 0)
    )
      return sendResponse(
        res,
        "UNAUTHORIZED",
        {
          success: false,
          error: t("auth.sessionNotFound", lang),
        },
        "/database/insert",
      );

    const { data, error } = await insertIntoTable(table, values);
    if (error)
      return sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        {
          error: t("database.insertError", lang),
          success: false,
        },
        "/database/insert",
      );

    return res.json({ success: true, data });
  } catch (error) {
    console.error(chalk.red("Error inserting to Database:"), error);
    try {
      res
        .status(500)
        .json({ success: false, error: t("database.insertError", lang) });
    } catch {
      // ignore
    }
  }
};

export const handleUpdateToDatabase = async (
  req: Request<unknown, unknown, RequestDatabaseUpdate>,
  res: Response<ResponseDatabaseUpdate>,
) => {
  const lang = req?.body?.lang || "en";

  try {
    let { match } = req.body || {};
    const { tokenDecoded: decode } = req.user || {};
    const { table, values } = req.body || {};

    if (!table || !TABLE_MAP?.[table] || !values)
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: t("database.invalidBody", lang), success: false },
        "/database/update",
      );

    if (!match) match = { userId: decode.userId };

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
    console.error(chalk.red("Error updating Database:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { success: false, error: t("database.updateError", lang) },
      "/database/update",
    );
  }
};

export const handleDeleteFromDatabase = async (
  req: Request<unknown, unknown, RequestDatabaseDelete>,
  res: Response<ResponseDatabaseDelete>,
) => {
  const lang = req?.body?.lang || "en";

  try {
    const { tokenDecoded: decode } = req.user || {};
    const { table, match } = req.body || {};

    if (!table || !TABLE_MAP?.[table])
      return sendResponse(
        res,
        "BAD_REQUEST",
        { error: t("database.invalidBody", lang), success: false },
        "/database/delete",
      );

    const { success, error } = await deleteInTable(decode.userId, table, match);
    if (error)
      return sendResponse(
        res,
        "INTERNAL_SERVER_ERROR",
        { success: false, error: t("database.deleteError", lang) },
        "/database/delete",
      );

    sendResponse(res, "SUCCESS", { success }, "/database/delete");
  } catch (error) {
    console.error(chalk.red("Error deleting from Database:"), error);
    sendResponse(
      res,
      "INTERNAL_SERVER_ERROR",
      { success: false, error: t("database.deleteError", lang) },
      "/database/delete",
    );
  }
};
