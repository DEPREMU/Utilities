import { Timers } from "../timer.ts";
import { Function } from "@types";

export class InstanceManager<T> {
  #deleteInstanceAfter: number;

  #getClass: () => T;
  #instance: T | null = null;

  #intervalId: number | null = null;

  private _clearInterval() {
    if (this.#intervalId) Timers.clearInterval(this.#intervalId);
    this.#intervalId = null;
  }

  public destroy() {
    this._clearInterval();
    if (!this.#instance) return;

    if (
      typeof this.#instance === "object" &&
      "destroy" in (this.#instance ?? {})
    ) {
      (this.#instance as { destroy?: () => void }).destroy?.();
    }

    this.#instance = null;
  }

  public startTimer() {
    this._clearInterval();

    this.#intervalId = Timers.setInterval(
      () => this.destroy(),
      this.#deleteInstanceAfter,
    ) as never;
  }

  public get instance() {
    this._clearInterval();
    if (!this.#instance) this.#instance = this.#getClass();
    return this.#instance;
  }

  constructor(
    getClass: Function<[], T & { destroy: Function<[], void> }>,
    deleteInstanceAfter: number,
  ) {
    this.#getClass = getClass;
    this.#deleteInstanceAfter = deleteInstanceAfter;
  }
}
