export type OnError<T> = (error: Error, errorMessage: string) => Promise<T>;

export type AnyFn<T = any> = (...args: any[]) => T;

type WrapFunctionWithError = {
  /**
   * Wraps an async function with no parameters, returning a Promise with a custom error handler or default handling
   */
  <T, E>(fn: () => Promise<T>, onError: OnError<E>): Promise<T | E>;

  /**
   * Wraps an async function with parameters, returning a wrapped function with a custom error handler or default handling
   */
  <T, A extends any[], E>(
    fn: (...args: A) => Promise<T>,
    returnFunctionWrapped: true,
    onError: (error: Error, errorMessage: string, ...args: A) => E,
  ): (...args: A) => E extends Promise<any> ? Promise<T> | E : Promise<T | E>;

  /**
   * Wraps an async function with no parameters but the function itself, returning a Promise with default error handling (returns undefined on error, if any)
   */
  <T, A extends any[]>(fn: (...args: A) => Promise<T>): Promise<T | undefined>;

  /**
   * Wraps an async function with parameters, returning a wrapped function with default error handling (returns undefined on error, if any)
   */
  <T, A extends any[]>(
    fn: (...args: A) => Promise<T>,
    returnFunctionWrapped: true,
  ): (...args: A) => Promise<T | undefined>;
};

export const wrapFunctionWithError: WrapFunctionWithError = (
  fn: AnyFn<Promise<any>>,
  arg1?: true | OnError<unknown>,
  arg2?: OnError<unknown>,
): any => {
  const returnFunctionWrapped = arg1 === true;
  const onError = typeof arg1 === "function" ? arg1 : arg2;

  const wrappedFun = async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      const errorMessage = `Error in function ${
        fn.name ? `"${fn.name}"` : '"unknown"'
      }: ${error instanceof Error ? error.message : String(error)}`;

      return await onError?.(
        ...([error as Error, errorMessage, ...(args || [])] as [Error, string]),
      );
    }
  };

  if (returnFunctionWrapped) return wrappedFun;

  return wrappedFun();
};
