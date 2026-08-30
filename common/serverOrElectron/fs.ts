import fs from "fs";
import path from "path";
import { inspect } from "node:util";

const wrapTryCatch = <P extends unknown[]>(
  fn: (...args: P) => void,
  ...args: P
): boolean => {
  try {
    fn(...args);
    return true;
  } catch {
    return false;
  }
};

const wrapAsyncTryCatch = async <P extends unknown[]>(
  fn: (...args: P) => Promise<void>,
  ...args: P
) => {
  try {
    await fn(...args);
    return true;
  } catch {
    return false;
  }
};

const success = () => true;
const failure = () => false;

class CommonFS {
  public path: string;

  public rm = Object.assign(
    async (options?: fs.RmOptions): Promise<boolean> =>
      wrapAsyncTryCatch(fs.promises.rm, this.path, options),
    {
      sync: (options?: fs.RmOptions): boolean =>
        wrapTryCatch(fs.rmSync, this.path, options),
    },
  );

  public exists = Object.assign(
    async (): Promise<boolean> =>
      wrapAsyncTryCatch(
        fs.promises.access,
        this.path,
        fs.constants.R_OK | fs.constants.W_OK | fs.constants.F_OK,
      ),
    {
      sync: (): boolean =>
        wrapTryCatch(
          fs.accessSync,
          this.path,
          fs.constants.R_OK | fs.constants.W_OK | fs.constants.F_OK,
        ),
    },
  );

  public rename = Object.assign(
    async (newPath: string | this): Promise<this | Error> => {
      const pathString = typeof newPath === "string" ? newPath : newPath.path;

      return await fs.promises
        .rename(this.path, pathString)
        .then(() => {
          this.path = pathString;
          return this;
        })
        .catch((e) => (e instanceof Error ? e : new Error(String(e))));
    },
    {
      sync: (newPath: string | this): this | Error => {
        const pathString = typeof newPath === "string" ? newPath : newPath.path;
        try {
          fs.renameSync(this.path, pathString);
          this.path = pathString;
          return this;
        } catch (e) {
          return e instanceof Error ? e : new Error(String(e));
        }
      },
    },
  );

  public createStream = {
    write: (
      options?: Parameters<typeof fs.createWriteStream>[1],
    ): fs.WriteStream => fs.createWriteStream(this.path, options),
    read: (
      options?: Parameters<typeof fs.createReadStream>[1],
    ): fs.ReadStream => fs.createReadStream(this.path, options),
  };

  public mkdir = Object.assign(
    async (
      options?: Parameters<typeof fs.promises.mkdir>[1],
    ): Promise<Directory | Error> => {
      try {
        let dir: string;

        try {
          const stat = await fs.promises.stat(this.path);
          dir = stat.isFile() ? path.dirname(this.path) : this.path;
        } catch {
          dir = path.extname(this.path) ? path.dirname(this.path) : this.path;
        }

        return await fs.promises
          .mkdir(dir, options)
          .then(() => new Directory(dir));
      } catch (e) {
        return e instanceof Error ? e : new Error(String(e));
      }
    },
    {
      sync: (options?: fs.MakeDirectoryOptions): Directory | Error => {
        try {
          let dir: string;
          try {
            const stat = fs.statSync(this.path);
            dir = stat.isFile() ? path.dirname(this.path) : this.path;
          } catch {
            dir = path.extname(this.path) ? path.dirname(this.path) : this.path;
          }

          fs.mkdirSync(dir, options);
          return new Directory(dir);
        } catch (e) {
          return e instanceof Error ? e : new Error(String(e));
        }
      },
    },
  );

  constructor(_path: string) {
    this.path = _path;
  }

  [inspect.custom]() {
    return this.toString();
  }

  toString() {
    return `CommonFS: "${this.path}"`;
  }
}

export class File extends CommonFS {
  public async stats(): Promise<fs.Stats | null> {
    return await fs.promises.stat(this.path).catch(() => null);
  }

  public readFile = Object.assign(
    async (encoding: BufferEncoding = "utf-8") =>
      await fs.promises.readFile(this.path, encoding).catch(() => ""),
    {
      sync: (encoding: BufferEncoding = "utf-8") => {
        try {
          return fs.readFileSync(this.path, encoding);
        } catch {
          return "";
        }
      },
    },
  );

  public writeFile = Object.assign(
    async (
      data: Parameters<typeof fs.promises.writeFile>[1],
      options?: Parameters<typeof fs.promises.writeFile>[2],
    ) =>
      await fs.promises
        .writeFile(this.path, data, options)
        .then(success)
        .catch(failure),
    {
      sync: (
        data: Parameters<typeof fs.writeFileSync>[1],
        options?: Parameters<typeof fs.writeFileSync>[2],
      ) => wrapTryCatch(fs.writeFileSync, this.path, data, options),
    },
  );

  public chmod = Object.assign(
    async (mode: Parameters<typeof fs.promises.chmod>[1]): Promise<boolean> => {
      return await fs.promises
        .chmod(this.path, mode)
        .then(success)
        .catch(failure);
    },
    {
      sync: (mode: Parameters<typeof fs.chmodSync>[1]) =>
        wrapTryCatch(fs.chmodSync, this.path, mode),
    },
  );

  public copyFile = Object.assign(
    async (
      destination: string,
      mode?: Parameters<typeof fs.promises.copyFile>[2],
    ): Promise<File | Error> => {
      return await fs.promises
        .copyFile(this.path, destination, mode)
        .then(() => new File(destination))
        .catch((e) => (e instanceof Error ? e : new Error(String(e))));
    },
    {
      sync: (
        destination: string,
        mode?: Parameters<typeof fs.copyFileSync>[2],
      ) => {
        try {
          fs.copyFileSync(this.path, destination, mode);
          return new File(destination);
        } catch (e) {
          return e instanceof Error ? e : new Error(String(e));
        }
      },
    },
  );

  constructor(_path: string) {
    super(_path);
  }
}

export class Directory extends CommonFS {
  public readDir = Object.assign(
    async (): Promise<string[]> => {
      return (await fs.promises.readdir(this.path).catch(() => [])) as string[];
    },
    {
      withFileTypes: async (): Promise<fs.Dirent[]> =>
        (await fs.promises
          .readdir(this.path, { withFileTypes: true })
          .catch(() => [])) as fs.Dirent[],
      sync: (): string[] => {
        try {
          return fs.readdirSync(this.path);
        } catch {
          return [];
        }
      },
      syncWithFileTypes: (): fs.Dirent[] => {
        try {
          return fs.readdirSync(this.path, { withFileTypes: true });
        } catch {
          return [];
        }
      },
    },
  );

  public createFile = Object.assign(
    async (
      filename: string,
      data: Parameters<typeof fs.promises.writeFile>[1],
      options?: Parameters<typeof fs.promises.writeFile>[2],
    ): Promise<File | Error> => {
      const filePath = path.join(this.path, filename);
      return await fs.promises
        .writeFile(filePath, data, options)
        .then(() => new File(filePath))
        .catch((e) => (e instanceof Error ? e : new Error(String(e))));
    },
    {
      sync: (
        filename: string,
        data: Parameters<typeof fs.writeFileSync>[1],
        options?: Parameters<typeof fs.writeFileSync>[2],
      ): File | Error => {
        try {
          const filePath = path.join(this.path, filename);
          fs.writeFileSync(filePath, data, options);
          return new File(filePath);
        } catch (e) {
          return e instanceof Error ? e : new Error(String(e));
        }
      },
    },
  );

  public copyDir = Object.assign(
    async (destination: string): Promise<Directory | Error> => {
      return await fs.promises
        .cp(this.path, destination, { recursive: true })
        .then(() => new Directory(destination))
        .catch((e) => (e instanceof Error ? e : new Error(String(e))));
    },
    {
      sync: (destination: string): Directory | Error => {
        try {
          fs.cpSync(this.path, destination, { recursive: true });
          return new Directory(destination);
        } catch (e) {
          return e instanceof Error ? e : new Error(String(e));
        }
      },
    },
  );

  constructor(_path: string) {
    super(_path);
  }
}

/**
 * Returns all paths of the Utilities project:
 * { root, app, types, common, server, utilitiesForPC }
 */
export const getAllPathsSync = () => {
  let root = process.cwd();

  let existsRequire = false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    existsRequire = typeof fs?.existsSync === "function";
  } catch {
    // Ignore
  }

  let success = false;
  let attempts = 0;
  while (attempts++ < 10) {
    try {
      const packagePath = path.join(
        root,
        "../".repeat(attempts - 1),
        "package.json",
      );

      const packageJSON = (
        existsRequire
          ? // eslint-disable-next-line @typescript-eslint/no-require-imports
            require(packagePath)
          : JSON.parse(fs.readFileSync(packagePath, "utf-8"))
      ) as typeof import("../../package.json");

      if (packageJSON.name === "utilities") {
        success = true;
        break;
      }
    } catch {
      // Ignore
    }
  }
  if (!success) throw new Error(`Unexpected utilities path: ${process.cwd()}.`);
  root = path.resolve(root, "../".repeat(attempts - 1));

  const APP_PATH = path.resolve(root, "app");
  const TYPES_PATH = path.resolve(root, "types");
  const COMMON_PATH = path.resolve(root, "common");
  const SERVER_PATH = path.resolve(root, "server");
  const FRONTEND_PATH = path.resolve(root, "frontend");
  const UTILITIES_FOR_PC_PATH = path.resolve(root, "UtilitiesForPC");

  return {
    root,

    app: APP_PATH,
    types: TYPES_PATH,
    common: COMMON_PATH,
    server: SERVER_PATH,
    frontend: FRONTEND_PATH,
    utilitiesForPC: UTILITIES_FOR_PC_PATH,
  };
};
