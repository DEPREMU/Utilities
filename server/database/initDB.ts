import fs from "fs";
import path from "path";
import chalk from "chalk";
import { pool } from "./postgres";
import DataJSON from "./data.json";
import { Directory, File, Logger } from "@common";
import type { TablesKeys } from "@types";
import { wrapFunctionWithError } from "@common";
import { REPLACERS, serverPath, TABLE_MAP } from "@/config.ts";
import { deleteOldSessions, getValidValueDB } from "@/database/functions.ts";
import { PoolClient } from "pg";

const getTableFilePath = (tableName: string) =>
  path.join(serverPath, "database", tableName + "_data.dbjson");

const sqlFile = new File(
  path.resolve(serverPath, "database", "create_tables.sql"),
);
const fileDataPath = path.resolve(serverPath, "database", "data.json");

const checkFilesExists = async () => {
  const dataFile = new File(fileDataPath);

  const [sqlExists, dataExists] = await Promise.all([
    sqlFile.exists(),
    dataFile.exists(),
  ]);
  if (!sqlExists) {
    Logger.error(
      chalk.red("SQL file not found:"),
      sqlFile.path,
      "Please check the path.",
    );
  }
  if (!dataExists) {
    Logger.error(
      chalk.red("Data JSON file not found:"),
      fileDataPath,
      "Please check the path.",
    );
  }
  if (!sqlExists || !dataExists) process.exit(1);
};
void checkFilesExists();

let intervalIdDeleteOldSessions: number | NodeJS.Timeout | null = null;

const writeBackups = async (
  client: PoolClient,
  tableNames: [TablesKeys, string][],
) => {
  const backupDir = new Directory(path.join(serverPath, "database", "backups"));
  if (!(await backupDir.exists())) await backupDir.mkdir({ recursive: true });

  for (const [, tableName] of tableNames) {
    if (tableName === TABLE_MAP.Logs) continue;

    const querySelect = `SELECT COUNT(*) FROM "${tableName}";`;
    const result = await client.query(querySelect);
    const count = parseInt(result.rows[0].count, 10);
    console.log(chalk.blue(`Backing up table "${tableName}": ${count} rows`));
    if (count === 0) continue;
    const chunkSize = count > 1000 ? 1000 : count;

    const file = new File(getTableFilePath(tableName));
    await file.writeFile("[", "utf-8");

    let lastText = "";

    for (let offset = 0; offset < count; offset += chunkSize) {
      try {
        const querySelectChunk = `SELECT * FROM "${tableName}" LIMIT ${chunkSize} OFFSET ${offset};`;
        const chunkResult = await client.query(querySelectChunk);
        console.log(
          chalk.blue(
            `Backing up table "${tableName}" (offset ${offset}): ${chunkResult.rows.length} rows`,
          ),
        );
        if (chunkResult.rows.length !== 0 && lastText) lastText += ",";

        if (lastText) {
          await file.writeFile(lastText, {
            flag: "a",
            encoding: "utf-8",
          });
          lastText = "";
        }

        let text = JSON.stringify(chunkResult.rows);

        text = text.slice(1, -1);
        lastText = text;
      } catch (e) {
        Logger.error(
          chalk.red(
            `Error writing backup for table "${tableName}" (offset ${offset}):`,
          ),
          e,
        );
      }
    }
    await file.writeFile(lastText + "]", { encoding: "utf-8", flag: "a" });

    Logger.log(
      chalk.green(`Backup created for table "${tableName}":`),
      file.path,
    );
  }
};

const dropTables = async (
  client: PoolClient,
  tableNames: [TablesKeys, string][],
) => {
  for (const [, tableName] of tableNames) {
    try {
      if (tableName === TABLE_MAP.Users) continue;

      const queryDelete = `DROP TABLE IF EXISTS "${tableName}";`;
      await client.query(queryDelete);
      Logger.log(chalk.yellow(`Table "${tableName}" dropped successfully.`));
    } catch (error) {
      Logger.error(chalk.red(`Error dropping table "${tableName}":`), error);
    }
  }

  await client.query(`DROP TABLE IF EXISTS "${TABLE_MAP.Users}";`);
  Logger.log(chalk.yellow(`Table "${TABLE_MAP.Users}" dropped successfully.`));
};

export const initDB = async () => {
  const client = await pool.connect();

  const sqlFileContent = await sqlFile.readFile("utf-8");
  const fileVersion = sqlFileContent
    .split("\n")[1]
    .split("Version: ")[1]
    .trim();

  try {
    await client.query(sqlFileContent);
  } catch {
    // Ignore
  }

  const dataFile = await new File(fileDataPath).readFile("utf-8");
  const dataJSON: typeof DataJSON = JSON.parse(dataFile || "{}");

  Logger.log(
    chalk.blue("Database initialization started"),
    `File version: ${fileVersion}`,
  );

  if (dataJSON.prevVersionSQL === fileVersion && false) return;

  await client.query("BEGIN");

  const tableNames = Object.entries(TABLE_MAP) as [TablesKeys, string][];

  try {
    //? Backup data from existing tables to files
    await writeBackups(client, tableNames);
    //? Drop existing tables
    await dropTables(client, tableNames);

    //? Create new tables with new structure
    await client.query(sqlFileContent);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  } catch (error) {}

  await wrapFunctionWithError(
    async () => {
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
