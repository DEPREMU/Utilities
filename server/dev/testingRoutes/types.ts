/* eslint-disable @typescript-eslint/no-explicit-any */
import { MethodsAPI, ResolveRoute } from "@types";

type GetFunction<T, R extends unknown[]> = (...args: R) => Promise<T> | T;

export type AnyMatcher = {
  __type: "any";
  constructor: unknown;
};

export type AnythingMatcher = {
  __type: "anything";
};

export type ObjectContainingMatcher<T = any> = {
  __type: "objectContaining";
  obj: T extends Array<infer U>
    ? Array<
        U extends object
          ? U | AnyMatcher | AnythingMatcher | ObjectContainingMatcher<any>
          : U
      >
    : {
        [K in keyof T]?: T[K] extends object
          ? T[K] | AnyMatcher | AnythingMatcher | ObjectContainingMatcher<any>
          : T[K];
      };
};

type GetResponse<T extends MethodsAPI, R extends RoutesAPI[T]> = ResolveRoute<
  FetchAPI<T>,
  R
>["response"] extends object
  ? Partial<ResolveRoute<FetchAPI<T>, R>["response"]>
  : ResolveRoute<FetchAPI<T>, R>["response"] | null;

type GetRequestBody<
  T extends MethodsAPI,
  R extends RoutesAPI[T],
> = ResolveRoute<FetchAPI<T>, R>["requestInput"] extends object
  ? Partial<ResolveRoute<FetchAPI<T>, R>["requestInput"]>
  : ResolveRoute<FetchAPI<T>, R>["requestInput"];

type GetResponseWithType<T> = T extends object
  ? {
      [K in keyof T]?: GetResponseWithType<T[K]>;
    }
  : T | AnyMatcher | AnythingMatcher | ObjectContainingMatcher<any>;

export type TestRoutes = {
  [K in MethodsAPI]: {
    [R in RoutesAPI[K]]: ({
      description: string;
      shouldSucceed:
        | boolean
        | GetFunction<boolean, [status: number, response: GetResponse<K, R>]>;
      expectedResponse: GetResponseWithType<GetResponse<K, R>>;

      onFinish?: GetFunction<void, [response: GetResponse<K, R> | null]>;
    } & (ResolveRoute<FetchAPI<K>, R> extends { auth: true }
      ? { auth: GetFunction<string, []> | string }
      : { auth?: never }) &
      (GetRequestBody<K, R> extends infer RequestInput
        ? [RequestInput] extends [null | never | undefined]
          ? { requestInput?: never }
          : {
              requestInput: RequestInput | GetFunction<RequestInput, []>;
            }
        : { requestInput?: never }))[];
  };
};

export type TestResult = {
  route: string;
  description: string;
  success: boolean;
  error?: string;
  response?: unknown;
  expectedResponse?: unknown;
  duration: number;
};

export type TestSummary = {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
};
