import {
  updateInTable,
  deleteInTable,
  fetchFromTable,
  insertIntoTable,
} from "../supabase/functions.ts";
import type {
  RequestSupabaseDelete,
  RequestSupabaseFetch,
  RequestSupabaseInsert,
  RequestSupabaseUpdate,
  ResponseSupabaseDelete,
  ResponseSupabaseFetch,
  ResponseSupabaseInsert,
  ResponseSupabaseUpdate,
} from "../../types";
import chalk from "chalk";
import { t } from "../translations/index.ts";
import type { Request, Response } from "express";

export const handleFetchFromSupabase = async (
  req: Request<unknown, unknown, RequestSupabaseFetch>,
  res: Response<ResponseSupabaseFetch>,
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
      console.error(chalk.red("Error fetching from Supabase:"), error);
      res.status(500).json({ error: t("supabase.fetchError", lang) });
      return;
    }

    res.json({ data });
  } catch (error) {
    console.error(chalk.red("Error fetching from Supabase:"), error);
    res.status(500).json({ error: t("supabase.fetchError", lang) });
  }
};

export const handleInsertToSupabase = async (
  req: Request<unknown, unknown, RequestSupabaseInsert>,
  res: Response<ResponseSupabaseInsert>,
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
        .json({ success: false, error: t("supabase.insertError", lang) });
      return;
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error(chalk.red("Error inserting to Supabase:"), error);
    res
      .status(500)
      .json({ success: false, error: t("supabase.insertError", lang) });
  }
};

export const handleUpdateToSupabase = async (
  req: Request<unknown, unknown, RequestSupabaseUpdate>,
  res: Response<ResponseSupabaseUpdate>,
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
        .json({ success: false, error: t("supabase.updateError", lang) });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error(chalk.red("Error updating Supabase:"), error);
    res
      .status(500)
      .json({ success: false, error: t("supabase.updateError", lang) });
  }
};

export const handleDeleteFromSupabase = async (
  req: Request<unknown, unknown, RequestSupabaseDelete>,
  res: Response<ResponseSupabaseDelete>,
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
        .json({ success: false, error: t("supabase.deleteError", lang) });
      return;
    }

    res.json({ success });
  } catch (error) {
    console.error(chalk.red("Error deleting from Supabase:"), error);
    res
      .status(500)
      .json({ success: false, error: t("supabase.deleteError", lang) });
  }
};
