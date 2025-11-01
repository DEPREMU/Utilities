import fs from "fs";
import env from "../../env.ts";
import path from "path";
import chalk from "chalk";
import { exec } from "child_process";
import { pool } from "../postgres.ts";

export const getInterval = () => {
  console.log("Starting database backup interval...");

  return setInterval(handleBackupDatabase, 24 * 60 * 60 * 1000);
};

const backupPath = path.join(path.resolve("."), "database", "backups");

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
const handleBackupDatabase = async () => {
  const client = await pool.connect();
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = path.join(backupPath, `backup-${timestamp}.sql.gpg`);

    const dumpCommand = `pg_dump --data-only --inserts --column-inserts \
  --host=${env.DB_HOST} --port=${env.DB_PORT} --username=${env.DB_USER} --dbname=${env.DB_NAME} \
| sed '/^INSERT INTO / s/);$/) ON CONFLICT DO NOTHING;/' \
| gpg --batch --yes --passphrase "${env.DB_ENCRYPTION_PASS}" \
  --symmetric --cipher-algo AES256 -o ${backupFileName}
`;

    exec(dumpCommand, (error, _, stderr) => {
      if (error) {
        console.error(`Error during backup: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Backup stderr: ${stderr}`);
        return;
      }
      console.log(`Backup completed successfully: ${backupFileName}`);
    });
  } catch (error) {
    console.error("Error during database backup:", error);
  } finally {
    client.release();
  }
};

export default getInterval();

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
  const files = fs.readdirSync(backupPath);
  const backupFiles = files.filter((file) => file.endsWith(".sql.gpg"));

  if (backupFiles.length === 0) {
    console.log(chalk.yellow("No backup files found for restoration."));
    return;
  }
  const latestBackupFile = backupFiles.sort().reverse()[0];
  const backupFilePath = path.join(backupPath, latestBackupFile);

  const restoreCommand = `gpg --batch --yes --passphrase "${env.DB_ENCRYPTION_PASS}" -d ${backupFilePath} \
| psql --host=${env.DB_HOST} --port=${env.DB_PORT} --username=${env.DB_USER} --dbname=${env.DB_NAME}`;

  return await new Promise((resolve) =>
    exec(restoreCommand, (error, _, stderr) => {
      if (error) {
        console.error(`Error during restoration: ${error.message}`);
        return resolve(false);
      }

      if (stderr) {
        console.error(`Restoration stderr: ${stderr}`);
        // Aquí podrías decidir si quieres tratar stderr como error o no
      }

      console.log(
        chalk.green(
          `Database restored successfully from backup: ${latestBackupFile}`,
        ),
      );
      resolve(true);
    }),
  );
};
