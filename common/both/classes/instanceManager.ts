type IntervalFunction = (callback: () => void, interval: number) => number;
type ClearIntervalFunction = (intervalId: number) => void;

export class InstanceManager<T> {
  #deleteInstanceAfter: number;

  #getClass: () => T;
  #instance: T | null = null;

  #intervalId: number | null = null;

  #setInterval: IntervalFunction;
  #clearInterval: ClearIntervalFunction;

  private _clearInterval = () => {
    if (this.#intervalId) this.#clearInterval(this.#intervalId);
    this.#intervalId = null;
  };

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

    this.#intervalId = this.#setInterval(
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
    getClass: () => T & { destroy: () => void },
    deleteInstanceAfter: number,
    setInterval: IntervalFunction,
    clearInterval: ClearIntervalFunction,
  ) {
    this.#getClass = getClass;
    this.#setInterval = setInterval;
    this.#clearInterval = clearInterval;
    this.#deleteInstanceAfter = deleteInstanceAfter;
  }
}
