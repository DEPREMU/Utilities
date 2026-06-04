import fs from "fs";
import path from "path";

const success = () => true;
const failure = () => false;

class CommonFS {
  public path: string;

  public rm = async (options?: fs.RmOptions): Promise<boolean> => {
    return await fs.promises
      .rm(this.path, options)
      .then(success)
      .catch(failure);
  };

  public exists = async (): Promise<boolean> => {
    return await fs.promises
      .access(
        this.path,
        fs.constants.R_OK | fs.constants.W_OK | fs.constants.F_OK,
      )
      .then(success)
      .catch(failure);
  };

  public rename = async (newPath: string): Promise<boolean> => {
    return await fs.promises
      .rename(this.path, newPath)
      .then(() => {
        this.path = newPath;
        return true;
      })
      .catch(failure);
  };

  public createWriteStream = (
    options?: Parameters<typeof fs.createWriteStream>[1],
  ) => {
    return fs.createWriteStream(this.path, options);
  };

  constructor(_path: string) {
    this.path = _path;
  }
}

export class File extends CommonFS {
  public stats = async (): Promise<fs.Stats | null> => {
    return await fs.promises.stat(this.path).catch(() => null);
  };

  public readFile = async (
    encoding: BufferEncoding = "utf-8",
  ): Promise<string> => {
    return (await fs.promises
      .readFile(this.path, encoding)
      .catch(() => "")) as never;
  };

  public writeFile = async (
    data: Parameters<typeof fs.promises.writeFile>[1],
    options?: Parameters<typeof fs.promises.writeFile>[2],
  ): Promise<boolean> => {
    return await fs.promises
      .writeFile(this.path, data, options)
      .then(success)
      .catch(failure);
  };

  public chmod = async (
    mode: Parameters<typeof fs.promises.chmod>[1],
  ): Promise<boolean> => {
    return await fs.promises
      .chmod(this.path, mode)
      .then(success)
      .catch(failure);
  };

  public copyFile = async (
    destination: string,
    mode?: Parameters<typeof fs.promises.copyFile>[2],
  ): Promise<File | Error> => {
    return await fs.promises
      .copyFile(this.path, destination, mode)
      .then(() => new File(destination))
      .catch((e) => (e instanceof Error ? e : new Error(String(e))));
  };

  constructor(_path: string) {
    super(_path);
  }
}

export class Directory extends CommonFS {
  public mkdir = async (
    options?: Parameters<typeof fs.promises.mkdir>[1],
  ): Promise<boolean> => {
    return await fs.promises
      .mkdir(path.dirname(this.path), options)
      .then(success)
      .catch(failure);
  };

  public readDir = async () => {
    return (await fs.promises.readdir(this.path).catch(() => [])) as string[];
  };

  public readDirWithFileTypes = async () => {
    return (await fs.promises
      .readdir(this.path, { withFileTypes: true })
      .catch(() => [])) as fs.Dirent[];
  };

  public createFile = async (
    filename: string,
    data: Parameters<typeof fs.promises.writeFile>[1],
    options?: Parameters<typeof fs.promises.writeFile>[2],
  ): Promise<File | Error> => {
    const filePath = path.join(this.path, filename);
    return await fs.promises
      .writeFile(filePath, data, options)
      .then(() => new File(filePath))
      .catch((e) => (e instanceof Error ? e : new Error(String(e))));
  };

  constructor(_path: string) {
    super(_path);
  }
}
