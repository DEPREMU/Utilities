import env from "../env.ts";
import chalk from "chalk";
import { pool } from "../database/postgres.ts";
import type { Request, Response } from "express";

export const handleDoQueryDatabase = async (
  req: Request<unknown, unknown, { query: string; showFields?: boolean }>,
  res: Response<{ result?: unknown | null; error?: string }>,
) => {
  if (!env.__DEV__) {
    res.status(403).json({ error: "Not available" });
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
      const data = {
        rowCount: result.rowCount,
        rows: result.rows,
        command: result.command,
        fields: showFields ? result.fields : undefined,
      };
      res.json({ result: data });
    } catch (error) {
      console.error(chalk.red("Error executing query:"), error);
      res.status(500).json({ error: `Error executing query: ${error}` });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(chalk.red("Error connecting to database:"), error);
    res.status(500).json({ error: `Error connecting to database: ${error}` });
  }
};
