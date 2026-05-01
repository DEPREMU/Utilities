export type StateFunction<T> = (prev: T) => T;

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

type SetFunction<T> = (value: T | StateFunction<T>) => void;

type GetState<K extends string, T> = {
  [P in K]: T;
} & {
  [P in K as `set${Capitalize<P>}`]: SetFunction<T>;
};

export type GetStatesZustand<T extends Record<string, unknown>> =
  UnionToIntersection<
    {
      [P in keyof T]: GetState<P, T[P]>;
    }[keyof T]
  >;
