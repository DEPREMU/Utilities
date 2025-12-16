import env from "../env.ts";
import chalk from "chalk";
import { pool } from "../database/postgres.ts";
import { Request, Response } from "express";
import { RequestDoQuery, ResponseDoQuery } from "@types";

export const handleDoQueryDatabase = async (
  req: Request<unknown, unknown, RequestDoQuery>,
  res: Response<ResponseDoQuery>,
) => {
  if (!["1", "true"].includes(env.__DEV__)) {
    res.status(403).json({ error: "Not available" });
    return;
  }

  try {
    const { query, showFields } = req.body;
    if (!query) {
      res.status(400).json({ error: "Query is required" });
      return;
    }

    const client = await pool.connect();
    try {
      const result = await client.query(query);
      const data: ResponseDoQuery["result"] = {
        rowCount: result.rowCount || 0,
        rows: result.rows || [],
        command: result.command,
        fields: showFields ? result.fields : undefined,
      };
      res.json({ result: data });
    } catch (error) {
      console.error(
        chalk.red("Error executing query:"),
        error instanceof Error ? error.message : error,
      );
      res.status(500).json({ error: `Error executing query: ${error}` });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(chalk.red("Error connecting to database:"), error);
    try {
      res.status(500).json({ error: `Error connecting to database: ${error}` });
    } catch (error) {
      console.error(chalk.red("Error sending error response:"), error);
    }
  }
};
