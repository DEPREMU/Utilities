export class Arrays {
  static convertToArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Execute an async callback for each item in an array with a limit on the number of concurrent executions.
   * @param concurrent - The maximum number of concurrent executions.
   * @param array - The array of items to process.
   * @param callback - The async callback function to execute for each item.
   * @returns A promise that resolves when all items have been processed.
   */
  static async forEachQueue<T>(
    concurrent: number,
    array: T[],
    callback: (item: T, index: number, array: T[]) => Promise<void>,
  ): Promise<void> {
    const queue: Set<Promise<unknown>> = new Set();

    let i = 0;
    while (i < array.length) {
      if (queue.size >= concurrent) await Promise.race(queue);
      else {
        const value = array[i];
        const promise = callback(value, i++, array).finally(() => {
          queue.delete(promise);
        });
        queue.add(promise);
      }
    }

    await Promise.allSettled(queue);
  }
}
