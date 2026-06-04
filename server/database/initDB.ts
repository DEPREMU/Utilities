import fs from "fs";
import path from "path";
import chalk from "chalk";
import { pool } from "./postgres";
import DataJSON from "./data.json";
import { File, Logger } from "@common";
import { getEnvValue } from "../env.ts";
import { wrapFunctionWithError } from "@common";
import { REPLACERS, serverPath, TABLE_MAP } from "../config.ts";
import { deleteOldSessions, getValidValueDB } from "./functions.ts";

const getTableFilePath = (tableName: string) =>
  path.join(serverPath, "database", tableName + "_data.dbjson");

const fileSQLPath = path.resolve(serverPath, "database", "create_tables.sql");
const fileDataPath = path.resolve(serverPath, "database", "data.json");

if (!fs.existsSync(fileSQLPath)) {
  Logger.error(
    chalk.red("SQL file not found:"),
    fileSQLPath,
    "Please check the path.",
  );
  process.exit(1);
}

if (!fs.existsSync(fileDataPath)) {
  Logger.error(
    chalk.red("Data JSON file not found:"),
    fileDataPath,
    "Please check the path.",
  );
  process.exit(1);
}

let intervalIdDeleteOldSessions: number | NodeJS.Timeout | null = null;

export const initDB = async () => {
  const client = await pool.connect();

  const fileSQL = fs.readFileSync(fileSQLPath, "utf-8");
  const fileVersion = fileSQL.split("\n")[1].split("Version: ")[1].trim();

  try {
    await client.query(fileSQL);
  } catch {
    // Ignore
  }

  const dataFile = fs.readFileSync(fileDataPath, "utf-8");
  const dataJSON: typeof DataJSON = JSON.parse(dataFile || "{}");

  Logger.log(
    chalk.blue("Database initialization started"),
    `File version: ${fileVersion}`,
  );

  if (dataJSON.prevVersionSQL === fileVersion) return;

  await client.query("BEGIN");

  const tableNames = Object.entries(TABLE_MAP);

  await wrapFunctionWithError(
    async () => {
      //? Create tables if not exist
      await client.query(fileSQL);

      //? Backup data from existing tables to files
      for (const [, tableName] of tableNames) {
        if (tableName === TABLE_MAP.Logs) continue;

        const querySelect = `SELECT * FROM "${tableName}";`;
        const result = await client.query(querySelect);

        if (result.rows.length === 0) continue;

        fs.writeFileSync(
          getTableFilePath(tableName),
          JSON.stringify(result.rows),
          "utf-8",
        );
      }

      //? Drop existing tables
      for (const [, tableName] of tableNames) {
        if (tableName === TABLE_MAP.Users) continue;

        const queryDelete = `DROP TABLE IF EXISTS "${tableName}";`;
        await client.query(queryDelete);
        Logger.log(chalk.yellow(`Table "${tableName}" dropped successfully.`));
      }
      await client.query(`DROP TABLE IF EXISTS "${TABLE_MAP.Users}";`);
      Logger.log(
        chalk.yellow(`Table "${TABLE_MAP.Users}" dropped successfully.`),
      );

      await client.query(fileSQL);

      //? Restore data from files to new tables
      for (const [key, tableName] of tableNames) {
        if (tableName === TABLE_MAP.Logs) continue;

        const tableFilePath = getTableFilePath(tableName);
        if (!fs.existsSync(tableFilePath)) continue;

        const fileData = fs.readFileSync(tableFilePath, "utf-8");
        const func = getValidValueDB?.[key as keyof typeof getValidValueDB];

        let rows: object[] = JSON.parse(fileData);
        rows = rows.map((row) => func?.(row)).filter((row) => row !== null);
        if (rows.length === 0) continue;

        const chunkSize = 500;
        const columns = Object.keys(rows[0]).map((c) => `"${c}"`);

        if (!func) {
          Logger.error(
            chalk.red(
              `No valid value function found for table "${tableName}". Data might not be restored correctly.`,
            ),
          );
          continue;
        }

        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);

          let valueIndex = 1;
          const valuesPlaceholders = chunk
            .map(() => `(${columns.map(() => `$${valueIndex++}`).join(", ")})`)
            .join(", ");

          const values = chunk.flatMap((row) => Object.values(row));

          const queryInsert = `INSERT INTO "${tableName}" (${columns.join(", ")}) VALUES ${valuesPlaceholders};`;

          await client.query(queryInsert, values);
        }
      }

      dataJSON.prevVersionSQL = fileVersion;
      if (!REPLACERS.isDev)
        await new File(fileDataPath).writeFile(
          JSON.stringify(dataJSON, null, 2),
          "utf-8",
        );

      await Promise.all(
        Object.entries(TABLE_MAP).map(async ([, tableName]) => {
          if (tableName === TABLE_MAP.Logs) return;
          const file = new File(getTableFilePath(tableName));
          if (!(await file.exists())) return;
          Logger.log(`Removing file: ${file.path}`);

          await file.rm({
            force: true,
            maxRetries: 5,
            retryDelay: 100,
          });
        }),
      );

      await client.query("COMMIT");
      Logger.log(
        chalk.green("Database initialized successfully with version:"),
        fileVersion,
      );
    },
    async (err, errorMessage) => {
      Logger.error(chalk.red("Error while updating the DB", errorMessage));
      await client.query("ROLLBACK");
    },
  );
  client.release();

  if (intervalIdDeleteOldSessions) {
    clearInterval(intervalIdDeleteOldSessions);
    intervalIdDeleteOldSessions = null;
  } else await deleteOldSessions();

  intervalIdDeleteOldSessions = setInterval(
    deleteOldSessions,
    24 * 60 * 60 * 1000,
  );
};
