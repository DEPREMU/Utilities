import { logger } from "../functions";
import { Network } from "@common";
import { EventEmitterService, Function } from "@types";

type Task<T extends unknown[] = unknown[]> = {
  function: Function<T>;
  arguments: T;
};

type Tasks = {
  internet: Task[];
  immediate: Task[];
};

class Background {
  #tasks: Map<keyof Tasks, Task[]> = new Map([
    ["internet", [] as Task[]],
    ["immediate", [] as Task[]],
  ]);

  #executing = false;

  #networkListener: EventEmitterService;

  public addTaskQueue = <T extends Task>(
    task: T,
    executeWhenInternet: boolean,
  ) => {
    const taskType = executeWhenInternet ? "internet" : "immediate";
    this.#tasks.get(taskType)?.push(task);

    this.runTaskQueue();
  };

  public runTaskQueue = async () => {
    if (this.#executing) return;
    this.#executing = true;

    try {
      const immediateTasks = this.#tasks.get("immediate") || [];
      if (immediateTasks.length) {
        await Promise.all(
          immediateTasks.map((task) => task.function(...task.arguments)),
        );
        this.#tasks.set("immediate", []);
      }

      const internetTasks = this.#tasks.get("internet") || [];
      if (internetTasks.length) {
        const hasInternet = await Network.isOnline();
        if (!hasInternet) return;

        await Promise.all(
          internetTasks.map((task) => task.function(...task.arguments)),
        );
        this.#tasks.set("internet", []);
      }
    } catch (error) {
      logger.error("Error executing background tasks:", error);
    } finally {
      this.#executing = false;
    }
  };

  public destroy() {
    this.#networkListener.remove();
  }

  constructor() {
    this.#networkListener = { remove: () => {} };

    import("@utils").then(({ deviceInfo, EventsDeviceInfo }) => {
      this.#networkListener = deviceInfo.addEventListener(
        EventsDeviceInfo.hasInternetChange,
        (hasInternet) => {
          if (!hasInternet || this.#tasks.get("internet")?.length === 0) return;

          this.runTaskQueue();
        },
      );
    });
  }
}

export const background = new Background();
