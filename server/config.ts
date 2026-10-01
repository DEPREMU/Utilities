import path from "path";
import { Directory, REPLACERS, Timers } from "@common";

type Functions = () => Promise<unknown> | unknown;

type Paths = {
  ROOT: string;
  UPLOAD_DIR: string;
  DATABASE_BACKUPS: string;
  WEB_PATH_UPDATES: string;
  CRYPTOS_JSON_DEV: string;
};

let ROOT = process.cwd() || path.resolve();
if (REPLACERS.isDev) ROOT = path.join(ROOT, "build");

class Config {
  static instance: Config;

  #functions: Functions[] = [];
  #initialized = false;

  readonly port = 3000;
  readonly host = "0.0.0.0";

  async executeFunctions() {
    if (this.#initialized) {
      REPLACERS.Logger.warn("Functions already executed");
      return;
    }

    this.#initialized = true;
    const MAX_TIME = 30 * 1000;

    while (this.#functions.length > 0) {
      const func = this.#functions.shift();

      if (typeof func !== "function") continue;

      const result = func();

      if (result instanceof Promise) {
        const abortController = new AbortController();
        const timeout = Timers.setTimeout(() => {
          abortController.abort();
        }, MAX_TIME);

        try {
          await result;
        } catch {
          // Ignore
        } finally {
          Timers.clearTimeout(timeout);
        }
      }
    }
  }

  executeFunctionAfterInit(func: Functions) {
    if (!this.#initialized) this.#functions.push(func);
    else return func();
  }

  readonly PATHS: Paths = {
    ROOT,
    UPLOAD_DIR: path.join(ROOT, "uploads"),
    DATABASE_BACKUPS: path.join(ROOT, "backups"),
    WEB_PATH_UPDATES: path.join(ROOT, "web-page"),
    CRYPTOS_JSON_DEV: REPLACERS.isDev
      ? path.join(ROOT, "routes", "cryptos", "cryptos.json")
      : "",
  };

  async init() {
    const keys = [
      "UPLOAD_DIR",
      "DATABASE_BACKUPS",
    ] as const satisfies (keyof Paths)[];

    await Promise.all(
      keys.map(async (key) => {
        const dir = new Directory(this.PATHS[key]);
        if (!(await dir.exists())) await dir.mkdir({ recursive: true });
      }),
    );

    return Config.instance;
  }

  getRoutes(key: keyof Paths): string {
    return this.PATHS[key];
  }

  constructor() {
    if (Config.instance) return Config.instance;

    Config.instance = this;
  }
}

const config = new Config();
void config.init();

export { config };
