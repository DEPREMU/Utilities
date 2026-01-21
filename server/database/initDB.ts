import fs from "fs";
import path from "path";
import chalk from "chalk";
import { pool } from "./postgres";
import DataJSON from "./data.json";
import { getEnvValue } from "env.ts";
import { deleteOldSessions } from "./functions.ts";
import { showError, showInfo } from "../functions/logger.ts";
import { wrapFunctionWithError } from "@common";
import { serverPath, TABLE_MAP } from "../config.ts";

const getTableFilePath = (tableName: string) =>
  path.join(serverPath, "database", tableName + "_data.dbjson");

const fileSQLPath = path.resolve(serverPath, "database", "create_tables.sql");
const fileDataPath = path.resolve(serverPath, "database", "data.json");

if (!fs.existsSync(fileSQLPath)) {
  showError(
    chalk.red("SQL file not found:"),
    fileSQLPath,
    "Please check the path.",
  );
  process.exit(1);
}

if (!fs.existsSync(fileDataPath)) {
  showError(
    chalk.red("Data JSON file not found:"),
    fileDataPath,
    "Please check the path.",
  );
  process.exit(1);
}

let intervalIdDeleteOldSessions: NodeJS.Timeout;

export const initDB = async () => {
  const fileSQL = fs.readFileSync(fileSQLPath, "utf-8");
  const fileVersion = fileSQL.split("\n")[1].split("Version: ")[1].trim();

  const dataFile = fs.readFileSync(fileDataPath, "utf-8");
  const dataJSON: typeof DataJSON = JSON.parse(dataFile || "{}");

  showInfo(
    chalk.blue("Database initialization started"),
    `File version: ${fileVersion}`,
  );

  if (dataJSON.prevVersionSQL === fileVersion) return;

  const client = await pool.connect();
  await client.query("BEGIN");

  const tableNames = Object.values(TABLE_MAP);

  await wrapFunctionWithError(
    async () => {
      for (const tableName of tableNames) {
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

      for (const tableName of tableNames) {
        if (tableName === TABLE_MAP.Users) continue;

        const queryDelete = `DROP TABLE IF EXISTS "${tableName}";`;
        await client.query(queryDelete);
        showInfo(chalk.yellow(`Table "${tableName}" dropped successfully.`));
      }
      await client.query(`DROP TABLE IF EXISTS "${TABLE_MAP.Users}";`);
      showInfo(
        chalk.yellow(`Table "${TABLE_MAP.Users}" dropped successfully.`),
      );

      await client.query(fileSQL);

      for (const tableName of tableNames) {
        if (tableName === TABLE_MAP.Logs) continue;

        const tableFilePath = getTableFilePath(tableName);
        if (!fs.existsSync(tableFilePath)) continue;

        const fileData = fs.readFileSync(tableFilePath, "utf-8");
        const rows: object[] = JSON.parse(fileData);
        if (rows.length === 0) continue;

        const chunkSize = 500;
        const columns = Object.keys(rows[0]).map((c) => `"${c}"`);

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
      !getEnvValue("__DEV__") &&
        fs.writeFileSync(
          fileDataPath,
          JSON.stringify(dataJSON, null, 2),
          "utf-8",
        );

      for (const tableName of tableNames) {
        const tableFilePath = getTableFilePath(tableName);
        if (!fs.existsSync(tableFilePath)) continue;
        showInfo(`Removing file: ${tableFilePath}`);

        fs.rmSync(tableFilePath, {
          force: true,
          retryDelay: 100,
          maxRetries: 5,
        });
      }

      await client.query("COMMIT");
    },
    async (_, errorMessage) => {
      showError(chalk.red("Error while updating the DB", errorMessage));
      await client.query("ROLLBACK");
    },
  );
  client.release();

  if (intervalIdDeleteOldSessions) clearInterval(intervalIdDeleteOldSessions);
  else await deleteOldSessions();

  intervalIdDeleteOldSessions = setInterval(
    deleteOldSessions,
    24 * 60 * 60 * 1000,
  );
};
