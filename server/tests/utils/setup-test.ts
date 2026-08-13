import fs from "fs";
import path from "path";
import { execSync, spawn, type ChildProcess } from "child_process";
import { ResponseHealth } from "@types";

const SERVER_PORT = 3000;
const SERVER_HOST = "localhost";
const HEALTH_URL = `http://${SERVER_HOST}:${SERVER_PORT}/api/info/health`;
const MAX_WAIT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

const waitForServer = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const deadline = Date.now() + MAX_WAIT_MS;

    const poll = () => {
      if (Date.now() > deadline) {
        reject(new Error("Server did not start in time"));
        return;
      }

      fetch(HEALTH_URL, { method: "get" })
        .then((res) => {
          res.json().then((d: ResponseHealth) => {
            if (d.timestamp) resolve();
            else setTimeout(poll, POLL_INTERVAL_MS);
          });
        })
        .catch(() => setTimeout(poll, POLL_INTERVAL_MS));
    };

    poll();
  });

const startServerProcess = (): ChildProcess => {
  const serverDir = path.resolve(__dirname, "..", "..");

  execSync("yarn run db-update && tsx ./build.ts", {
    cwd: serverDir,
    stdio: "inherit",
    env: { ...process.env, __DEV__: "true" },
  });

  const child = spawn("node", ["./build/index.cjs"], {
    cwd: serverDir,
    stdio: "inherit",
    env: { ...process.env, __DEV__: "true" },
    detached: false,
  });

  return child;
};

const setup = async (): Promise<void> => {
  const isServerAlive = await new Promise<boolean>((resolve) => {
    fetch(HEALTH_URL, { method: "get" })
      .then((res) => {
        res.json().then((d: ResponseHealth) => resolve(!!d.timestamp));
      })
      .catch(() => resolve(false));
  });

  if (isServerAlive) return;

  const child = startServerProcess();

  process.on("exit", () => {
    try {
      child.kill("SIGTERM");
    } catch {
      // already exited
    }
  });

  await waitForServer();

  fs.writeFileSync("process_id.txt", child.pid?.toString() || "unknown");
};

export default setup;
