import "./backups/index.ts";

import path from "path";
import chalk from "chalk";
import { File } from "@common";
import { exec } from "child_process";
import { PrismaPg } from "@prisma/adapter-pg";
import { getEnvValue } from "@/env.ts";
import { PrismaClient } from "@/generated/prisma/index.js";
import { getDbConfig } from "./functions.ts";

export let dbInitialized = false;

if (!getEnvValue("DATABASE_URL")) {
  throw new Error(
    chalk.red("DATABASE_URL is not defined in environment variables"),
  );
}

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
  const { username, password, hostname, port, database } = getDbConfig();

  const pgpass = `${hostname}:${port}:${database}:${username}:${password}`;

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
    new File(pgpassFilePath).writeFile(pgpass, { mode: 0o600 });
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

  dbInitialized = true;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
