import path from "path";
import { spawn } from "child_process";
import { config } from "@/config";
import { prisma } from "../postgres";
import { getEnvValue } from "@/env";
import { getDbConfig } from "../functions";
import { decryptFile, encryptedExtension } from "./utils";
import { Directory, ExecuteOnce, File, Logger, REPLACERS } from "@common";

await ExecuteOnce.execute(
  "Restore data if DB is empty",
  undefined,
  async () => {
    if (REPLACERS.isDev) return;

    const logger = new Logger("RestoreDataDB");
    logger.log("Starting DB restore process...");

    const count = await prisma.databaseBackups.count();
    if (count > 0)
      return logger.log(
        `DB is already initialized. DatabaseBackups count: ${count}`,
      );

    const dbBackupDir = new Directory(config.getRoutes("DATABASE_BACKUPS"));
    const files = await dbBackupDir.readDir.withFileTypes();

    if (files.length === 0)
      return logger.warn(
        "No db backups on the directory, and there is no data in the backups db.",
      );

    const dates = files
      .map((file) => {
        if (!file.isFile()) return null;

        const splitted = file.name.replace(encryptedExtension, "").split("-");
        const num = splitted.find((v) => !isNaN(Number(v)));
        if (!num) return null;

        const date = Number(num);

        return { date, filename: file.name };
      })
      .filter((v) => v !== null);

    const sorted = dates.sort((a, b) => a.date - b.date);

    const latest = sorted[sorted.length - 1];

    const file = new File(
      path.join(config.getRoutes("DATABASE_BACKUPS"), latest.filename),
    );

    const copyFile = await file.copyFile(
      file.path.replace(encryptedExtension, ".sql"),
    );

    if (copyFile instanceof Error) {
      logger.error("Error while copying the latest file:", copyFile);
      return;
    }

    await decryptFile(copyFile.path, getEnvValue("DB_ENCRYPTION_PASS"));

    try {
      const { hostname, port, username, database } = getDbConfig();

      const args = [
        "--no-psqlrc",
        "--no-password",
        "--set=ON_ERROR_STOP=1",
        "--single-transaction",
        `--host=${hostname}`,
        `--port=${port}`,
        `--username=${username}`,
        `--dbname=${database}`,
        `--file=${copyFile.path}`,
      ];

      const psql = spawn("psql", args, {
        stdio: ["ignore", "ignore", "inherit"],
        env: process.env,
      });

      await new Promise<void>((resolve, reject) => {
        psql.once("error", reject);

        psql.once("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Restore failed with code ${code}`));
          }
        });
      });

      logger.log(
        "Data restored successfully. Users count:",
        await prisma.users.count(),
      );
    } catch (error) {
      logger.error("Error while restoring data:", error);
    } finally {
      await copyFile.rm({ force: true });
    }
  },
);
