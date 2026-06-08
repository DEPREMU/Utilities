import Piscina from "piscina";
import { File } from "./fs.ts";
import { Logger } from "./logger.ts";
import { ServiceClass, Timers } from "../both/index.ts";
import { getPiscinaWorkerPath } from "./piscina.ts";
import { WorkerData, WorkerFiles } from "@types";

type CommonData = {
  /**
   * The maximum time in milliseconds to wait for the task to complete before automatically aborting it. If not provided, the task will run until completion or until manually aborted. This can be useful to prevent tasks from running indefinitely and consuming resources.
   */
  abortAfter?: number;
};

type DataTask<F extends WorkerFiles> = {
  /**
   * If true, the worker will not be destroyed after getting the result, allowing for multiple calls to getResult without reinitializing the worker. Use this if you plan to call getResult multiple times and want to avoid the overhead of destroying and reinitializing the worker each time. Remember to call the abort method when you are done to free up resources.
   */
  doNotDestroy?: boolean;
  /**
   * The path to the worker file. This file should export a function that will be executed in the worker thread. The function can be the default export or a named export if you provide the functionName property.
   */
  fileWorker: F;
  filePath: string;
} & CommonData;

type Data<
  F extends WorkerFiles,
  FunctionName extends keyof WorkerData<F>["functions"],
  D = WorkerData<F>["functions"][FunctionName] extends { data: infer T }
    ? T
    : never,
> = {
  /**
   * The name of the function to execute in the worker file. If not provided, the default export will be used. This allows you to have multiple functions in the same worker file and specify which one to run when calling getResult.
   */
  functionName?: FunctionName;
  abortController?: AbortController;
} & (D extends never ? { data?: D } : { data: D }) &
  CommonData;

export class Task<ReturnValue, F extends WorkerFiles> extends ServiceClass<
  Record<string, () => void>
> {
  #data: DataTask<F>;
  #piscina: Piscina;
  existsFile: boolean | null = null;
  #controllers = new Set<AbortController>();

  #verifyFileExists = async (
    filepath: string = this.#data.filePath,
  ): Promise<boolean> => {
    const file = new File(filepath);

    return await file.exists();
  };

  public destroy() {
    super.destroy();

    this.#piscina.destroy();
    this.#controllers.forEach((ctrl) => ctrl.abort());
    this.#controllers.clear();
  }

  public getResult = async <
    FunctionName extends keyof WorkerData<F>["functions"],
  >(
    data?: Data<F, FunctionName>,
  ): Promise<ReturnValue | Error> => {
    let x = 0;
    if (!this.isInitialized) await this.waitUntilInitialized();
    if (!this.existsFile) return new Error("File does not exist.");

    const controller = new AbortController();
    this.#controllers.add(controller);

    let timeoutId: number | null = null;

    const handleFinish = () => {
      console.log(++x, "Task finished, cleaning up...");
      if (timeoutId) Timers.clearTimeout(timeoutId);
      timeoutId = null;

      controller.abort();
      this.#controllers.delete(controller);

      if (this.#data.doNotDestroy) return;

      this.destroy();
    };

    try {
      const abortAfter = data?.abortAfter ?? this.#data.abortAfter;
      if (typeof abortAfter === "number") {
        timeoutId = Timers.setTimeout(handleFinish, abortAfter);
      }

      const dataToSend = data?.data ?? {};
      const name = data?.functionName as string | undefined;
      const res = this.#piscina.run(dataToSend, {
        name,
        signal: controller.signal,
      });

      return await res;
    } catch (error) {
      Logger.error(++x, "Error getting task result:", error);
      return error instanceof Error ? error : new Error(String(error));
    } finally {
      handleFinish();
    }
  };

  override async _init(): Promise<void> {
    if (this.existsFile === null)
      this.existsFile = await this.#verifyFileExists();
  }

  constructor(data: Omit<DataTask<F>, "filePath">) {
    super();
    this.#data = {
      ...data,
      filePath: getPiscinaWorkerPath(data.fileWorker),
    };

    this.#piscina = new Piscina({
      filename: this.#data.filePath,
    });

    this._reInit();
  }
}
