import os from "os";
import env from "../env.ts";
import chalk from "chalk";
import pidUsage from "pidusage";
import { execSync } from "child_process";

let pidDB: number | null = null;

const monitorServer = async () => {
  try {
    const stats = await pidUsage(process.pid);
    console.log(
      chalk.bgGrey.cyanBright(
        `Server CPU Usage: ${stats.cpu.toFixed(2)}% | Memory Usage: ${(stats.memory / 1024 / 1024).toFixed(2)} MB | Uptime: ${Math.floor(stats.elapsed / 1000)}s`,
      ),
    );
  } catch (err) {
    console.error("Error monitoring server:", err);
  }
};

const monitorDB = async () => {
  try {
    let ok: boolean = false;

    try {
      await pidUsage(pidDB || "");
      ok = true;
    } catch {
      ok = false;
    }

    if (!ok || !pidDB) {
      let pids: string[] = [];
      const dbName = env.DB_NAME || "UtilitiesDB";

      if (os.platform() === "win32") {
        const output = execSync(
          // eslint-disable-next-line quotes
          'tasklist /FI "IMAGENAME eq postgres.exe" /V',
        ).toString();
        const regex = new RegExp("postgres.exe\\s+(\\d+)", "g");
        let match;
        while ((match = regex.exec(output)) !== null) {
          pids.push(match[1]);
        }
      } else {
        try {
          const pid = execSync(`pgrep -f "postgres:.*${dbName}"`);
          pids = pid.toString().trim().split("\n");
        } catch {
          pids = [];
        }
      }

      const pidStats = await Promise.all(
        pids.map(async (singlePid) => {
          try {
            return await pidUsage(singlePid);
          } catch {
            return null;
          }
        }),
      )
        .then((results) =>
          results.filter((res): res is pidUsage.Status => res !== null),
        )
        .catch(() => []);

      if (pidStats.length > 0) {
        const highestUptimePid = pidStats.reduce((prev, current) =>
          prev.elapsed > current.elapsed ? prev : current,
        );
        pidDB = highestUptimePid.pid;
      }
    }

    if (!pidDB) return;

    const stats = await pidUsage(pidDB);
    console.log(
      chalk.bgGrey.cyanBright(
        `Database CPU Usage: ${stats.cpu.toFixed(2)}% | Memory Usage: ${(stats.memory / 1024 / 1024).toFixed(2)} MB | Uptime: ${Math.floor(stats.elapsed / 1000)}s`,
      ),
    );
  } catch (err) {
    console.error("Error monitoring database:", err);
  }
};

export const monitorServerUsage = () => {
  monitorServer();
  monitorDB();
};

export default env.__DEV__ ? setInterval(monitorServerUsage, 10000) : undefined;
