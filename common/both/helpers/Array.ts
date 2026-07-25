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
    {
      if (concurrent <= 1) {
        for (let i = 0; i < array.length; i++) {
          await callback(array[i], i, array);
        }
        return;
      }

      const queue: Set<Promise<unknown>> = new Set();

      let i = 0;
      while (array.length > 0) {
        if (queue.size < concurrent) {
          const value = array.shift();
          if (value === undefined) break;

          const promise = callback(value, i, array).then(() => {
            queue.delete(promise);
          });
          queue.add(promise);
        } else await Promise.race(queue);

        i++;
      }

      await Promise.all(queue);
    }
  }
}
