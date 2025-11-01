import "./backups/index.ts";

import fs from "fs";
import env from "../env.ts";
import path from "path";
import chalk from "chalk";
import { Pool } from "pg";
import type { PoolConfig } from "pg";
import { exec } from "child_process";
import { serverPath, TABLE_MAP } from "../config.ts";
import { handleRestoreDatabase } from "./backups/index.ts";

const dbConfig: PoolConfig = {
  port: env.DB_PORT,
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
 * Handles the creation of database tables by dropping existing tables and recreating them.
 *
 * This function performs the following operations:
 * 1. Connects to the database pool
 * 2. Queries and logs all rows from the users table
 * 3. Drops all existing tables defined in TABLE_MAP with CASCADE
 * 4. Reads the SQL schema from create_tables.sql file
 * 5. Executes the SQL to create new database tables
 *
 * @returns A promise that resolves when the database tables are created successfully
 *
 * @throws Will log an error if table creation fails, but does not throw
 *
 * @remarks
 * - The client connection is always released in the finally block
 * - Success and error messages are logged to console with color formatting
 * - This operation is destructive and will delete all existing data in the dropped tables
 */
const handleCreateDB = async () => {
  const client = await pool.connect();
  const usersCount = await client.query("SELECT COUNT(*) FROM users;");
  console.log(
    chalk.bgBlack(`Number of users before drop: ${usersCount.rows[0].count}`),
  );
  await client.query(
    Object.values(TABLE_MAP)
      .map((t) => `DROP TABLE IF EXISTS ${t} CASCADE`)
      .join(";\n"),
  );
  const createTablesQuery = fs.readFileSync(
    path.join(serverPath, "database", "create_tables.sql"),
    "utf-8",
  );

  try {
    await client.query(createTablesQuery);

    console.log(chalk.green("Database tables created successfully."));
  } catch (error) {
    console.error(chalk.red("Error creating database tables:"), error);
  } finally {
    client.release();
  }
};

handleCreatePgPassFile();
handleCreateDB().then(async () => {
  await handleRestoreDatabase();
  const client = await pool.connect();
  const usersCount = await client.query("SELECT COUNT(*) FROM users;");
  console.log(
    chalk.bgBlack(`Number of users after drop: ${usersCount.rows[0].count}`),
  );
});
