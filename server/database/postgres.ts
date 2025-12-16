import "./backups/index.ts";

import fs from "fs";
import env from "../env.ts";
import path from "path";
import chalk from "chalk";
import { Pool } from "pg";
import { exec } from "child_process";
import { initDB } from "./initDB.ts";
import { PoolConfig } from "pg";

export let dbInitialized = false;

const dbConfig: PoolConfig = {
  port: Number(env.DB_PORT),
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASS,
  database: env.DB_NAME,
};

if (!env.DB_USER || !env.DB_PASS || !env.DB_NAME) {
  throw new Error(
    chalk.red(
      "DB_USER, DB_PASS or DB_NAME is not defined in environment variables",
    ),
  );
}

/**
 * Initializes and exports a PostgreSQL pool instance.
 *
 * The `pool` constant is created using the `Pool` class from pg,
 * which manages a pool of database connections for efficient querying.
 *
 * @constant
 */
export const pool = new Pool(dbConfig);

pool.on("error", (err) => {
  console.error(chalk.red("Unexpected error on idle client"), err);
  process.exit(-1);
});

/**
 * Creates a PostgreSQL password file (.pgpass or pgpass.conf) to enable password-less authentication.
 *
 * On Windows systems, the file is created at `%APPDATA%\postgresql\pgpass.conf`.
 * On Unix-like systems (Linux, macOS), the file is created at `~/.pgpass`.
 *
 * The password file format follows PostgreSQL's standard:
 * `hostname:port:database:username:password`
 *
 * The file permissions are set to 0600 (owner read/write only) as required by PostgreSQL
 * for security purposes.
 *
 * @throws {Error} If the APPDATA environment variable is not defined on Windows systems
 *
 * @remarks
 * This function uses environment variables from `env` object (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS)
 * to construct the password file content.
 */
const handleCreatePgPassFile = () => {
  const pgpass = `${env.DB_HOST}:${env.DB_PORT}:${env.DB_NAME}:${env.DB_USER}:${env.DB_PASS}`;

  const isWindows = process.platform === "win32";

  let pgpassFilePath: string;
  if (isWindows) {
    if (!process.env.APPDATA)
      throw new Error("APPDATA environment variable is not defined");
    pgpassFilePath = path.join(
      process.env.APPDATA,
      "postgresql",
      "pgpass.conf",
    );
    fs.writeFileSync(pgpassFilePath, pgpass, { mode: 0o600 });
  } else {
    pgpassFilePath = "~/.pgpass";
    exec(`echo "${pgpass}" > ${pgpassFilePath} && chmod 600 ${pgpassFilePath}`);
  }
};

/**
 * Initializes the database by performing the following operations:
 * 1. Creates a PostgreSQL password file
 * 2. Creates the database
 * 3. Restores the database from backup
 * 4. Queries and logs the number of users in the database
 * 5. Sets the database initialization flag to true
 *
 * @returns A promise that resolves when the database initialization is complete
 * @throws {Error} If any database operation fails
 */
export const handleInitDB = async () => {
  handleCreatePgPassFile();
  await initDB();
  try {
    const client = await pool.connect();
    const usersCount = await client.query("SELECT COUNT(*) FROM users;");
    console.log(
      chalk.bgBlack(`Number of users after drop: ${usersCount.rows[0].count}`),
    );
  } catch (error) {
    console.error(chalk.red("Error querying users count:"), error);
    throw new Error("Failed to query users count" + (error as Error).message);
  }

  dbInitialized = true;
};
