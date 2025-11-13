import { writeLog } from "./logger";

let monitorIntervalId: NodeJS.Timeout | number | null = null;
const MEMORY_THRESHOLD_MB = 500; // Alertar si supera 500MB
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Verificar cada 5 minutos

export const startMemoryMonitor = (): void => {
  if (monitorIntervalId) {
    writeLog("Memory monitor already running", "warn");
    return;
  }

  writeLog("Starting memory monitor...", "info");

  const checkMemoryUsage = () => {
    if (!process.memoryUsage) return;

    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);

    writeLog(
      `Memory usage - Heap: ${heapUsedMB}MB, RSS: ${rssMB}MB, External: ${externalMB}MB`,
      "info"
    );

    if (rssMB > MEMORY_THRESHOLD_MB) {
      writeLog(
        `⚠️ HIGH MEMORY USAGE DETECTED: ${rssMB}MB (threshold: ${MEMORY_THRESHOLD_MB}MB)`,
        "warn"
      );

      if (global.gc) {
        writeLog("Forcing garbage collection...", "info");
        try {
          global.gc();
          const newMemUsage = process.memoryUsage();
          const newRssMB = Math.round(newMemUsage.rss / 1024 / 1024);
          writeLog(
            `Memory after GC - RSS: ${newRssMB}MB (freed: ${
              rssMB - newRssMB
            }MB)`,
            "info"
          );
        } catch (error) {
          writeLog(`Error forcing GC: ${error}`, "error");
        }
      } else {
        writeLog(
          "Garbage collection not available. Run with --expose-gc flag.",
          "warn"
        );
      }
    }
  };

  checkMemoryUsage();

  monitorIntervalId = setInterval(checkMemoryUsage, CHECK_INTERVAL_MS);
};

export const stopMemoryMonitor = (): void => {
  if (!monitorIntervalId) return;

  clearInterval(monitorIntervalId);
  monitorIntervalId = null;
  writeLog("Memory monitor stopped", "info");
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
    writeLog(
      "Garbage collection not available. Run with --expose-gc flag.",
      "warn"
    );
    return false;
  }

  try {
    const beforeMem = getMemoryReport();
    writeLog(
      `Memory before GC - RSS: ${beforeMem.rssMB}MB, Heap: ${beforeMem.heapUsedMB}MB`,
      "info"
    );

    global.gc();

    const afterMem = getMemoryReport();
    const freedMB = beforeMem.rssMB - afterMem.rssMB;
    writeLog(
      `Memory after GC - RSS: ${afterMem.rssMB}MB, Heap: ${afterMem.heapUsedMB}MB (freed: ${freedMB}MB)`,
      "info"
    );

    return true;
  } catch (error) {
    writeLog(`Error forcing GC: ${error}`, "error");
    return false;
  }
};
