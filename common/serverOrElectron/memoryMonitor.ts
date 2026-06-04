import { Logger } from "./logger.ts";

let monitorIntervalId: ReturnType<typeof setInterval> | null = null;
const MEMORY_THRESHOLD_MB = 500; // Alert if RSS exceeds 500MB
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

export const startMemoryMonitor = (): void => {
  if (monitorIntervalId) {
    Logger.warn("Memory monitor already running");
    return;
  }

  Logger.log("Starting memory monitor...");

  const checkMemoryUsage = () => {
    if (typeof process.memoryUsage !== "function") return;

    const memUsage = process.memoryUsage();
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);

    Logger.log(
      `Memory usage - Heap: ${heapUsedMB}MB, RSS: ${rssMB}MB, External: ${externalMB}MB`,
    );

    if (rssMB <= MEMORY_THRESHOLD_MB) return;

    Logger.warn(
      `⚠️ HIGH MEMORY USAGE DETECTED: ${rssMB}MB (threshold: ${MEMORY_THRESHOLD_MB}MB)`,
    );

    if (typeof global.gc === "function") {
      Logger.log("Forcing garbage collection...");
      try {
        global.gc();
        const newMemUsage = process.memoryUsage();
        const newRssMB = Math.round(newMemUsage.rss / 1024 / 1024);
        Logger.log(
          `Memory after GC - RSS: ${newRssMB}MB (freed: ${rssMB - newRssMB}MB)`,
        );
      } catch (error) {
        Logger.error("Error forcing GC:", error);
      }
    } else {
      Logger.warn(
        "Garbage collection not available. Run with --expose-gc flag.",
      );
    }
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

export const forceGarbageCollection = (): boolean => {
  if (!global.gc) {
    Logger.warn("Garbage collection not available. Run with --expose-gc flag.");
    return false;
  }

  try {
    const beforeMem = getMemoryReport();
    Logger.log(
      `Memory before GC - RSS: ${beforeMem.rssMB}MB, Heap: ${beforeMem.heapUsedMB}MB`,
    );

    global.gc();

    const afterMem = getMemoryReport();
    const freedMB = beforeMem.rssMB - afterMem.rssMB;
    Logger.log(
      `Memory after GC - RSS: ${afterMem.rssMB}MB, Heap: ${afterMem.heapUsedMB}MB (freed: ${freedMB}MB)`,
    );

    return true;
  } catch (error) {
    Logger.error("Error forcing GC:", error);
    return false;
  }
};
