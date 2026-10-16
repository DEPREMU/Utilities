import os from "os";
import path from "path";
import chalk from "chalk";
import crypto from "crypto";
import { Directory, File, Helper, Logger, Timers } from "@common";

const logger = new Logger("WhatsAppTempMedia");

const TEMP_BASE_DIR = new Directory(
  path.join(os.tmpdir(), "utilities-whatsapp-temp"),
);
let cleanupTimer: number | null = null;

TEMP_BASE_DIR.mkdir({ recursive: true });

export const saveTempMedia = async (
  buffer: Buffer,
  extension: string = "bin",
): Promise<string> => {
  const safeExt = extension.replace(/^\./, "");
  const randomName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${safeExt}`;

  const filePath = path.join(TEMP_BASE_DIR.path, randomName);
  await new File(filePath).writeFile(buffer);
  return filePath;
};

export const deleteTempFile = async (filePath: string): Promise<boolean> => {
  if (!filePath) return false;

  return await new File(filePath).rm({ force: true });
};

export const cleanExpiredTempFiles = async (
  maxAgeMs: number = 60 * 60 * 1000,
): Promise<number> => {
  try {
    const files = await TEMP_BASE_DIR.readDir();
    const now = Date.now();
    let removedCount = 0;

    await Helper.Arrays.forEachQueue(5, files, async (filename) => {
      const file = new File(path.join(TEMP_BASE_DIR.path, filename));

      const stats = await file.stats();

      if (!stats || now - stats.mtimeMs > maxAgeMs) {
        await file.rm({ force: true });
        removedCount += 1;
      }
    });

    if (removedCount > 0) {
      logger.log(
        chalk.gray(`Cleaned up ${removedCount} expired WhatsApp temp file(s)`),
      );
    }
    return removedCount;
  } catch (error) {
    logger.error(
      chalk.yellow("Error during expired temp files cleanup:"),
      error,
    );
    return 0;
  }
};

export const startHourlyTempCleanup = (): number => {
  if (cleanupTimer) Timers.clearInterval(cleanupTimer);

  const ONE_HOUR_MS = 60 * 60 * 1000;
  cleanupTimer = Timers.setInterval(() => {
    void cleanExpiredTempFiles(ONE_HOUR_MS);
  }, ONE_HOUR_MS);

  return cleanupTimer;
};

export const stopHourlyTempCleanup = (): void => {
  if (!cleanupTimer) return;

  Timers.clearInterval(cleanupTimer);
  cleanupTimer = null;
};
