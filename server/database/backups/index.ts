import fs from "fs";
import env from "../../env.ts";
import path from "path";
import chalk from "chalk";
import crypto from "crypto";
import { pool } from "../postgres.ts";
import { execSync } from "child_process";

const backupPath = path.join(path.resolve("."), "database", "backups");

export const getInterval = () => {
  console.log("Starting database backup interval...");

  return setInterval(handleBackupDatabase, 24 * 60 * 60 * 1000);
};

export const encryptFile = (filePath: string, password: string) => {
  const data = fs.readFileSync(filePath);

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  const output = Buffer.concat([salt, iv, tag, encrypted]);
  fs.writeFileSync(filePath, output);

  console.log(chalk.green(`File encrypted successfully: ${filePath}`));
};

export const decryptFile = (filePath: string, password: string) => {
  const fileData = fs.readFileSync(filePath);

  const salt = fileData.subarray(0, 16);
  const iv = fileData.subarray(16, 28);
  const tag = fileData.subarray(28, 44);
  const encrypted = fileData.subarray(44);

  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString();
  } catch (err) {
    console.error(chalk.red("Error decrypting file:"), (err as Error).message);
    throw new Error("Failed to decrypt (incorrect password or file).");
  }
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
  const client = await pool.connect();
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = path.join(backupPath, `backup-${timestamp}.sql`);

    const writeFile = `pg_dump --data-only --inserts --column-inserts \
  --host=${env.DB_HOST} --port=${env.DB_PORT} --username=${env.DB_USER} --dbname=${env.DB_NAME} \
| sed '/^INSERT INTO / s/);$/) ON CONFLICT DO NOTHING;/' > ${backupFileName}`;

    execSync(writeFile);
    encryptFile(backupFileName, env.DB_ENCRYPTION_PASS);
  } catch (error) {
    console.error("Error during database backup:", error);
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
  const files = fs.readdirSync(backupPath);

  await Promise.all(
    files.map(async (file) => {
      if (!file.startsWith("backup-") || !file.endsWith(".sql.gpg")) {
        return Promise.resolve();
      }
      const date = file.replace("backup-", "").replace(".sql.gpg", "");
      const correctDate =
        date.split("T")[0] + " " + date.split("T")[1].replace(/-/g, ":");
      const fileDate = new Date(correctDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - fileDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) return Promise.resolve();

      const filePath = path.join(backupPath, file);
      fs.unlinkSync(filePath);
      console.log(`Deleted old backup file: ${filePath}`);
      return Promise.resolve();
    }),
  );
};

/**
 * Restores the database from the latest encrypted backup file.
 *
 * This function scans the backup directory for encrypted SQL backup files (.sql.gpg),
 * selects the most recent one based on filename sorting, decrypts it using GPG,
 * and restores it to the PostgreSQL database.
 *
 * @returns {Promise<boolean | undefined>} A promise that resolves to:
 * - `true` if the database was restored successfully
 * - `false` if an error occurred during restoration
 * - `undefined` if no backup files were found
 *
 * @remarks
 * - Requires GPG and psql to be installed and available in the system PATH
 * - Uses environment variables for database connection and encryption passphrase
 * - Backup files must have the `.sql.gpg` extension
 * - The latest backup is determined by reverse alphabetical sort of filenames
 *
 * @example
 * ```typescript
 * const success = await handleRestoreDatabase();
 * if (success) {
 *   console.log("Restoration completed");
 * }
 * ```
 */
export const handleRestoreDatabase = async () => {
  await deletePreviousBackups();
  const files = fs.readdirSync(backupPath);
  const backupFiles = files.filter((file) => file.endsWith(".sql"));

  if (backupFiles.length === 0) {
    console.log(chalk.yellow("No backup files found for restoration."));
    return;
  }
  const latestBackupFile = backupFiles.sort().reverse()[0];
  const backupFilePath = path.join(backupPath, latestBackupFile);

  const file = decryptFile(backupFilePath, env.DB_ENCRYPTION_PASS);
  const query = file
    .split("\n")
    .filter(
      (line) =>
        line.trim() !== "" &&
        !line.startsWith("--") &&
        !line.startsWith("\\") &&
        !line.startsWith("SET") &&
        !line.startsWith("SELECT"),
    )
    .join("\n")
    .replace(/public\./g, "");

  try {
    const client = await pool.connect();
    await client.query(query);
    const usersCount = await client.query("SELECT COUNT(*) FROM users;");
    console.log(
      chalk.bgBlack(`Number of users after drop: ${usersCount.rows[0].count}`),
    );
    client.release();
  } catch (error) {
    console.error("Error during database restoration:", error);
  }
};

export default getInterval();
