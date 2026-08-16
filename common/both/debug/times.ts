import { REPLACERS } from "../REPLACERS";
import humanizeDuration from "humanize-duration";

export class DebugTime {
  #name: string;
  #id: number = 0;
  #times: Map<number, { start: number; end?: number; taken?: number }> =
    new Map();

  startTimer() {
    const id = this.#id++;
    this.#times.set(id, { start: Date.now() });
    return id;
  }

  stopTimer(id: number) {
    const time = this.#times.get(id);
    if (!time) return;
    time.end = Date.now();
    time.taken = time.end - time.start;
    return time.taken;
  }

  reset() {
    this.#times.clear();
    this.#id = 0;
  }

  getTimes() {
    return { ...this.#times };
  }

  getAverageTaken() {
    const times = [...this.#times.values()];
    const taken = times.filter((t): t is Required<typeof t> => !!t.taken);
    if (taken.length === 0) return 0;
    return taken.reduce((acc, t) => acc + t.taken, 0) / taken.length;
  }

  logAverageTaken() {
    const averageTaken = this.getAverageTaken();
    REPLACERS.Logger.log(
      `Average taken for ${this.#name}: ${humanizeDuration(averageTaken, {
        units: ["h", "m", "s", "ms"],
      })}`,
    );
  }

  constructor(name: string) {
    this.#name = name;
  }
}
