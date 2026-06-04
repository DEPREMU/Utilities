import fs from "fs";
import path from "path";
import chalk from "chalk";
import { exec } from "child_process";
import { pool } from "@/database/postgres.ts";
import { REPLACERS } from "@/config.ts";
import { getEnvValue } from "@/env.ts";
import { Directory, File, Logger, Task } from "@common";

const backupPath = path.join(path.resolve("."), "database", "backups");
const timeIntervalBackup = 1 * 60 * 60 * 1000;
const encryptedExtension = ".sql.gpg";

export const getInterval = () => {
  Logger.log("Starting database backup interval...");

  handleBackupDatabase();
  return setInterval(handleBackupDatabase, timeIntervalBackup);
};

const encryptionTask = new Task<boolean, "ENCRYPTION">({
  fileWorker: "ENCRYPTION",
  doNotDestroy: true,
});

export const encryptFile = async (filePath: string, password: string) => {
  const file = new File(filePath);
  const copyFile = await file.copyFile(filePath + ".bak");

  if (copyFile instanceof Error) {
    Logger.error(
      chalk.red("Error creating backup file for encryption:"),
      copyFile,
    );
    return;
  }

  const res = await encryptionTask.getResult({
    data: { inputPath: copyFile.path, password, outputPath: filePath },
    abortAfter: 5 * 60 * 1000,
    functionName: "encryptData",
  });
  if (res instanceof Error) {
    Logger.error(chalk.red("Error encrypting file:"), res);
    return;
  }

  Logger.log(chalk.green(`File encrypted successfully: ${filePath}`));
};

export const decryptFile = async (
  filePath: string,
  password: string,
  returnString = false,
): Promise<string | void> => {
  const file = new File(filePath);
  if (!(await file.exists())) {
    Logger.error(chalk.red("File to decrypt does not exist:"), filePath);
    return;
  }

  const copyFile = await file.copyFile(filePath + ".bak");
  if (copyFile instanceof Error) {
    Logger.error(
      chalk.red("Error creating backup file for decryption:"),
      copyFile,
    );
    return;
  }

  const res = await encryptionTask.getResult({
    data: { inputPath: copyFile.path, password, outputPath: filePath },
    abortAfter: 5 * 60 * 1000,
    functionName: "decryptData",
  });
  if (res instanceof Error) {
    Logger.error(chalk.red("Error decrypting file:"), res);
    return;
  }
  Logger.log(chalk.green(`File decrypted successfully: ${filePath}`));

  if (!returnString) return;

  const decryptedContent = await file.readFile("utf-8");
  return decryptedContent;
};

/**
 * Creates an encrypted backup of the database using pg_dump.
 *
 * This function performs the following operations:
 * 1. Connects to the database pool
 * 2. Generates a timestamped backup filename
 * 3. Executes pg_dump with data-only, insert format options
 * 4. Modifies INSERT statements to include ON CONFLICT DO NOTHING clauses
 * 5. Encrypts the backup using GPG with AES256 cipher
 * 6. Saves the encrypted backup to the configured backup path
 *
 * The backup command requires the following environment variables:
 * - DB_HOST: Database host address
 * - DB_PORT: Database port number
 * - DB_USER: Database username
 * - DB_NAME: Database name
 * - DB_ENCRYPTION_PASS: GPG encryption passphrase
 *
 * @returns A promise that resolves when the backup process is initiated
 * @throws Logs errors to console if backup fails or encounters issues
 *
 * @example
 * ```typescript
 * await handleBackupDatabase();
 * ```
 */
export const handleBackupDatabase = async () => {
  if (REPLACERS.isDev) return;

  await deletePreviousBackups();
  const client = await pool.connect();
  try {
    const timestamp = Date.now();
    const backupFileName = path.join(
      backupPath,
      `backup-${timestamp}${encryptedExtension}`,
    );

    const writeFile = `pg_dump --data-only --inserts --column-inserts \
  --host=${getEnvValue("DB_HOST")} --port=${getEnvValue("DB_PORT")} --username=${getEnvValue("DB_USER")} --dbname=${getEnvValue("DB_NAME")} \
| sed '/^INSERT INTO / s/);$/) ON CONFLICT DO NOTHING;/' > ${backupFileName}`;

    exec(writeFile, (error, _, stderr) => {
      if (error) {
        Logger.error(chalk.red("Error during database backup:"), error.message);
        return;
      }
      if (stderr) {
        Logger.error(chalk.red("Error output during database backup:"), stderr);
        return;
      }
      Logger.log(
        chalk.green(`Database backup created successfully: ${backupFileName}`),
      );
      void encryptFile(backupFileName, getEnvValue("DB_ENCRYPTION_PASS"));
    });
  } catch (error) {
    Logger.error("Error during database backup:", error);
  } finally {
    client.release();
  }
};

/**
 * Deletes backup files older than 7 days from the configured backup directory.
 *
 * This function:
 * - Asynchronously reads the directory pointed to by the external `backupPath` variable.
 * - Expects backup file names to follow the pattern: `backup-<date>.sql.gpg` where `<date>`
 *   is a string parseable by `new Date(...)`.
 * - Parses the date portion of each file name, computes the age in days (using absolute time
 *   difference rounded up via `Math.ceil`), and attempts to remove files whose age is
 *   greater than 7 days.
 *
 * Notes and side effects:
 * - All operations are performed asynchronously using `fs.readdir` and `fs.unlink`. The
 *   function returns immediately and does not provide a completion promise or callback.
 * - Errors encountered while reading the directory or deleting individual files are logged
 *   to the console but are not thrown or propagated.
 * - The function depends on externally scoped variables (`backupPath`, `fs`, `path`) being
 *   available and correctly initialized.
 * - Date parsing relies on `Date` constructor behavior; if a file's date portion is not
 *   parseable, the calculated age may be `NaN` and the code will not delete that file as
 *   intended. Consider validating the parsed date or enforcing a strict date format (e.g.
 *   ISO 8601) if deterministic behavior is required.
 *
 * Example:
 * ```ts
 * // Ensures backups older than 7 days are removed from the configured directory.
 * deletePreviousBackups();
 * ```
 *
 * @returns void — function performs work asynchronously and does not return a promise.
 */
export const deletePreviousBackups = async () => {
  const files = await new Directory(backupPath).readDir();

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(backupPath, file);

      if (file.startsWith("backup-") && file.endsWith("sql"))
        return fs.promises.unlink(filePath);
      if (!file.startsWith("backup-") || !file.endsWith(encryptedExtension))
        return;

      const date = Number(
        file.replace("backup-", "").replace(encryptedExtension, ""),
      );
      const fileDate = new Date(date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - fileDate.getTime());
      const diffDays = Math.ceil(diffTime / timeIntervalBackup);

      if (diffDays <= 7) return;

      await new File(filePath).rm();

      Logger.log(`Deleted old backup file: ${filePath}`);
      return;
    }),
  );
};

export default getInterval();
