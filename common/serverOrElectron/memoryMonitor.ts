import chalk from "chalk";
import pidUsage from "pidusage";
import { Logger } from "./logger.ts";
import bytes, { BytesOptions } from "bytes";

let monitorIntervalId: ReturnType<typeof setInterval> | null = null;
const MEMORY_THRESHOLD = 750 * 1024 * 1024; // Alert if RSS exceeds 750MB
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

const bytesOptions: BytesOptions = { unit: "MB", decimalPlaces: 2 };

export const startMemoryMonitor = (): void => {
  if (monitorIntervalId) {
    Logger.warn("Memory monitor already running");
    return;
  }

  Logger.log("Starting memory monitor...");

  const checkMemoryUsage = () => {
    if (typeof process.memoryUsage !== "function") return;

    const memUsage = process.memoryUsage();

    pidUsage(process.pid, (e, s) => {
      if (e) {
        Logger.error(
          chalk.red("[Runtime Health] PID:"),
          process.pid,
          "| Error:",
          e,
        );
        return;
      }

      Logger.log(
        chalk.cyan(
          [
            `[Runtime Health] PID: ${s.pid} | CPU: ${s.cpu.toFixed(2)}%`,
            `HeapUsed: ${bytes(memUsage.heapUsed, bytesOptions)}`,
            `HeapTotal: ${bytes(memUsage.heapTotal, bytesOptions)}`,
            `External: ${bytes(memUsage.external, bytesOptions)}`,
            `Process Memory: ${bytes(s.memory, bytesOptions)}`,
            `Array Buffer: ${bytes(memUsage.arrayBuffers, bytesOptions)}`,
          ].join("\t| "),
        ),
      );
    });

    if (memUsage.rss <= MEMORY_THRESHOLD) return;

    Logger.warn(
      chalk.yellow(
        `⚠️ HIGH MEMORY USAGE DETECTED: ${bytes(memUsage.rss, bytesOptions)} (threshold: ${bytes(MEMORY_THRESHOLD, bytesOptions)})`,
      ),
    );
  };

  checkMemoryUsage();
  monitorIntervalId = setInterval(checkMemoryUsage, CHECK_INTERVAL_MS);
};

export const stopMemoryMonitor = (): void => {
  if (!monitorIntervalId) return;

  clearInterval(monitorIntervalId);
  monitorIntervalId = null;
  Logger.log("Memory monitor stopped");
};

export const getMemoryReport = (): {
  heapUsedMB: number;
  rssMB: number;
  externalMB: number;
  heapTotalMB: number;
} => {
  const memUsage = process.memoryUsage();
  return {
    heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    rssMB: Math.round(memUsage.rss / 1024 / 1024),
    externalMB: Math.round(memUsage.external / 1024 / 1024),
  };
};
