import { promisify } from "util";
import { exec, spawn, SpawnOptions } from "child_process";

const execAsync = promisify(exec);

export class Exec {
  private onData: Set<(chunk: string) => void> = new Set();
  private onErrorData: Set<(chunk: string) => void> = new Set();

  private emitData = (chunk: string) =>
    this.onData.forEach((fun) => fun(chunk));
  private emitErrorData = (chunk: string) =>
    this.onErrorData.forEach((fun) => fun(chunk));

  public async = Object.assign(execAsync, {
    onData: (fun: (chunk: string) => void) => {
      this.onData.add(fun);
      return this.async;
    },
    onErrorData: (fun: (chunk: string) => void) => {
      this.onErrorData.add(fun);
      return this.async;
    },
    run: (command: string, options: SpawnOptions) => {
      if (!options?.signal)
        throw new Error(
          "You must run a command with a AbortController signal.",
        );

      const child = spawn(command, {
        ...options,
        shell: true,
        stdio: ["inherit", "pipe", "pipe"],
      });

      return new Promise((resolve, reject) => {
        child.stdout?.on("data", (chunk: Buffer) => {
          this.emitData(chunk.toString());
        });

        child.stderr?.on("data", (chunk: Buffer) => {
          this.emitErrorData(chunk.toString());
        });

        child.on("error", reject);

        child.on("close", (code) => {
          if (code === null) {
            return reject(new Error("Process terminated"));
          }

          return code === 0
            ? resolve(code)
            : reject(new Error(`Process exited with code ${code}`));
        });
      });
    },
  });
}
