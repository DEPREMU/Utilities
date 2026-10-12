import chalk from "chalk";
import { Data } from "./Data";
import { Script } from "./Script";
import { Logger } from "@commonSrc/serverOrElectron";
import humanizeDuration from "humanize-duration";
import type { StepFunctionType } from "./types";

const logger = new Logger("CommonSteps");

export abstract class Steps extends Data {
  protected stopped = false;

  protected abortController: AbortController | null = null;

  protected stepFunctions: { label: string; func: StepFunctionType }[] = [];

  protected executeFunction = async (
    item: (typeof this.stepFunctions)[0],
    stopOnError: boolean,
  ) => {
    const { label, func } = item;

    try {
      logger.log(chalk.cyan(`Executing: "${label}"`));

      if (!this.abortController) this.abortController = new AbortController();

      const t = Date.now();
      await func(this as never, this.abortController);

      logger.log(
        chalk.green(
          `Completed: "${label}" on ${humanizeDuration(Date.now() - t, {
            units: ["h", "m", "s"],
            largest: 2,
          })}`,
        ),
      );
    } catch (error) {
      logger.error(chalk.red(`Error in step: "${label}".`), error);
      if (stopOnError) throw error;
    } finally {
      this.abortController = null;
    }
  };

  public addStep(label: string, func: StepFunctionType) {
    this.stepFunctions.push({ label, func });

    return this as unknown as Script;
  }

  public abstract run: ((stopOnError: boolean) => Promise<Script>) & {
    executeStep: (index: number, stopOnError: boolean) => Promise<void>;
  };

  public abstract stop: (reason?: string, exitCode?: number) => void;
}
