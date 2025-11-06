import {
  updateInTable,
  deleteInTable,
  fetchFromTable,
  insertIntoTable,
} from "../database/functions.ts";
import {
  RequestDatabaseDelete,
  RequestDatabaseFetch,
  RequestDatabaseInsert,
  RequestDatabaseUpdate,
  ResponseDatabaseDelete,
  ResponseDatabaseFetch,
  ResponseDatabaseInsert,
  ResponseDatabaseUpdate,
} from "@types";
import chalk from "chalk";
import { t } from "../translations/index.ts";
import { Request, Response } from "express";

export const handleFetchFromDatabase = async (
  req: Request<unknown, unknown, RequestDatabaseFetch>,
  res: Response<ResponseDatabaseFetch>,
) => {
  const lang = req.body.lang || "en";
  let { match } = req.body || { match: null };
  try {
    const { table } = req.body;
    const { tokenDecoded: decode } = req.user;

    if (!decode) {
      res.status(401).json({ error: t("auth.invalidToken", lang) });
      return;
    }
    if (!match) match = { userId: decode.userId };

    const { data, error } = await fetchFromTable(table, match);

    if (error) {
      console.error(chalk.red("Error fetching from Database:"), error);
      res.status(500).json({ error: t("database.fetchError", lang) });
      return;
    }

    res.json({ data });
  } catch (error) {
    console.error(chalk.red("Error fetching from Database:"), error);
    res.status(500).json({ error: t("database.fetchError", lang) });
  }
};

export const handleInsertToDatabase = async (
  req: Request<unknown, unknown, RequestDatabaseInsert>,
  res: Response<ResponseDatabaseInsert>,
) => {
  const lang = req.body.lang || "en";
  try {
    const { table, values } = req.body;
    const { token, tokenDecoded: decode } = req.user;

    if (!decode) {
      res
        .status(401)
        .json({ success: false, error: t("auth.invalidToken", lang) });
      return;
    }
    const { data: usersSessions } = await fetchFromTable("UserSessions", {
      userId: decode.userId,
      token,
    });
    if (
      !usersSessions ||
      (Array.isArray(usersSessions) && usersSessions.length === 0)
    ) {
      res
        .status(401)
        .json({ success: false, error: t("auth.sessionNotFound", lang) });
      return;
    }

    const { data, error } = await insertIntoTable(table, values);
    if (error) {
      res
        .status(500)
        .json({ success: false, error: t("database.insertError", lang) });
      return;
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error(chalk.red("Error inserting to Database:"), error);
    res
      .status(500)
      .json({ success: false, error: t("database.insertError", lang) });
  }
};

export const handleUpdateToDatabase = async (
  req: Request<unknown, unknown, RequestDatabaseUpdate>,
  res: Response<ResponseDatabaseUpdate>,
) => {
  const lang = req.body.lang || "en";

  try {
    let { match } = req.body;
    const { tokenDecoded: decode } = req.user;
    const { table, values } = req.body;

    if (!decode) {
      res
        .status(401)
        .json({ success: false, error: t("auth.invalidToken", lang) });
      return;
    }
    if (!match) match = { userId: decode.userId };

    const { data, error } = await updateInTable(table, values, match);
    if (error) {
      res
        .status(500)
        .json({ success: false, error: t("database.updateError", lang) });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error(chalk.red("Error updating Database:"), error);
    res
      .status(500)
      .json({ success: false, error: t("database.updateError", lang) });
  }
};

export const handleDeleteFromDatabase = async (
  req: Request<unknown, unknown, RequestDatabaseDelete>,
  res: Response<ResponseDatabaseDelete>,
) => {
  const lang = req.body.lang || "en";

  try {
    const { tokenDecoded: decode } = req.user;
    const { table, match } = req.body;
    if (!decode) {
      res
        .status(401)
        .json({ success: false, error: t("auth.invalidToken", lang) });
      return;
    }
    const { success, error } = await deleteInTable(decode.userId, table, match);
    if (error) {
      res
        .status(500)
        .json({ success: false, error: t("database.deleteError", lang) });
      return;
    }

    res.json({ success });
  } catch (error) {
    console.error(chalk.red("Error deleting from Database:"), error);
    res
      .status(500)
      .json({ success: false, error: t("database.deleteError", lang) });
  }
};
