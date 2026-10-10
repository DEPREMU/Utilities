import { Function } from "@types";

export class ExecuteOnce {
  static #executed = new Map<string, unknown>();

  static execute<T, A extends unknown[]>(
    key: string,
    options: { saveData: boolean } = { saveData: false },
    func: Function<A, T>,
    ...args: A
  ): T extends Promise<infer R> ? Promise<R> : T {
    if (this.#executed.has(key)) return this.#executed.get(key) as never;

    const result = func(...args);

    this.#executed.set(key, options.saveData ? result : true);
    return result as never;
  }

  static clear() {
    ExecuteOnce.#executed.clear();
  }

  static getExecuted(key: string) {
    return ExecuteOnce.#executed.get(key);
  }
}
