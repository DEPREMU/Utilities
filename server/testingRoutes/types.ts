/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @stylistic/indent */
import { FetchAPI, RequestBody, RoutesAPI, TablesKeys } from "@types";

export type AnyMatcher = {
  __type: "any";
  constructor: unknown;
};

export type AnythingMatcher = {
  __type: "anything";
};

export type ObjectContainingMatcher<T> = {
  __type: "objectContaining";
  obj: T;
};

type ResponseOf<
  T extends RoutesAPI,
  U extends TablesKeys | undefined = TablesKeys,
> = U extends TablesKeys
  ? Extract<FetchAPI<U>, { url: T }>["response"]
  : Extract<FetchAPI, { url: T }>["response"];

type GetTableByRoute<T extends RoutesAPI> =
  Extract<FetchAPI, { url: T }> extends { body: { table: infer Table } }
    ? Table extends TablesKeys
      ? Table
      : undefined
    : undefined;

type BodyValue<
  T extends RoutesAPI,
  U extends TablesKeys | undefined = TablesKeys,
> = U extends TablesKeys ? RequestBody<T, U> : RequestBody<T>;

type BodyResolver<
  T extends RoutesAPI,
  U extends TablesKeys | undefined = TablesKeys,
> =
  | BodyValue<T, U>
  | (() => BodyValue<T, U>)
  | (() => Promise<BodyValue<T, U>>);

export type TestCase<
  T extends RoutesAPI,
  U extends TablesKeys | undefined = GetTableByRoute<T>,
> = {
  body: BodyResolver<T, U>;
  route: T;
  description: string;
  expectedResponse: U extends TablesKeys
    ? {
        [K in keyof ResponseOf<T, U>]?:
          | ResponseOf<T, U>[K]
          | AnyMatcher
          | AnythingMatcher
          | ObjectContainingMatcher<any>;
      }
    : {
        [K in keyof ResponseOf<T>]?:
          | ResponseOf<T>[K]
          | AnyMatcher
          | AnythingMatcher
          | ObjectContainingMatcher<any>;
      };

  shouldSucceed: boolean;
  onSuccess?: (response: ResponseOf<T, U> | null) => Promise<void> | void;
} & (T extends RoutesAPI<"middleware"> ? { authorization: () => string } : {});

/**
 * Represents a single test case for an API route
 */
export type RouteTestCase<T extends RoutesAPI> = {
  route: T;
  description: string;
  body: Extract<FetchAPI, { url: T }> extends { body: infer B } ? B : undefined;
  expectedResponse: Partial<Extract<FetchAPI, { url: T }>["response"]>;
  shouldSucceed: boolean;
};

/**
 * Ensures that every route has at least 3 test cases
 * This type will throw a compile error if a route is missing
 */
export type RouteTestSuite = {
  [K in RoutesAPI]: [
    RouteTestCase<K>,
    RouteTestCase<K>,
    RouteTestCase<K>,
    ...RouteTestCase<K>[],
  ];
};

/**
 * Flattened array of all test cases
 */
export type AllTestCases = {
  [K in RoutesAPI]: RouteTestCase<K>;
}[RoutesAPI][];

/**
 * Test execution result
 */
export type TestResult = {
  route: string;
  description: string;
  success: boolean;
  error?: string;
  response?: unknown;
  expectedResponse?: unknown;
  duration: number;
};

/**
 * Test summary statistics
 */
export type TestSummary = {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
};
