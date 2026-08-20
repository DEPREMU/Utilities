import type { STATUS_RESPONSE } from "../../common/both";
import { TypeOfJS, MethodsAPI, DEFAULT_RESPONSE } from "@types";
import { Handler, NextFunction, Request, Response } from "express";

// #####################################################
// #################### GetUrlFetch ####################
// #####################################################

// Core simplification utility
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

// Utility to verify if a union of objects results exclusively in empty objects
type IsUnionEmpty<T> = true extends (
  T extends T ? ([keyof T] extends [never] ? false : true) : never
)
  ? false
  : true;

// String parsing helpers
type RemoveTrailingHyphen<T extends string> = T extends `${infer Core}-`
  ? RemoveTrailingHyphen<Core>
  : T;

type CleanParamString<
  T extends string,
  Acc extends string = "",
> = T extends `${infer Char}${infer Rest}`
  ? Char extends "/" | "{" | "}" | "?" | ":" | ";" | "&" | "."
    ? RemoveTrailingHyphen<Acc>
    : CleanParamString<Rest, `${Acc}${Char}`>
  : RemoveTrailingHyphen<Acc>;

// Parses exact modifiers into strongly typed objects
type ParseModifiers<T extends string> =
  T extends `${infer Name}-number-optional`
    ? { name: Name; type: number; optional: true }
    : T extends `${infer Name}-optional-number`
      ? { name: Name; type: number; optional: true }
      : T extends `${infer Name}-string-optional`
        ? { name: Name; type: string; optional: true }
        : T extends `${infer Name}-optional-string`
          ? { name: Name; type: string; optional: true }
          : T extends `${infer Name}-boolean-optional`
            ? { name: Name; type: boolean; optional: true }
            : T extends `${infer Name}-optional-boolean`
              ? { name: Name; type: boolean; optional: true }
              : T extends `${infer Name}-number`
                ? { name: Name; type: number; optional: false }
                : T extends `${infer Name}-string`
                  ? { name: Name; type: string; optional: false }
                  : T extends `${infer Name}-boolean`
                    ? { name: Name; type: boolean; optional: false }
                    : T extends `${infer Name}-optional`
                      ? { name: Name; type: string; optional: true }
                      : { name: T; type: string; optional: false };

// Recursively strips modifier suffixes from the final URL string
type RemoveModifiers<T extends string> =
  T extends `${infer Prefix}-number-optional${infer Suffix}`
    ? RemoveModifiers<`${Prefix}${Suffix}`>
    : T extends `${infer Prefix}-optional-number${infer Suffix}`
      ? RemoveModifiers<`${Prefix}${Suffix}`>
      : T extends `${infer Prefix}-string-optional${infer Suffix}`
        ? RemoveModifiers<`${Prefix}${Suffix}`>
        : T extends `${infer Prefix}-optional-string${infer Suffix}`
          ? RemoveModifiers<`${Prefix}${Suffix}`>
          : T extends `${infer Prefix}-boolean-optional${infer Suffix}`
            ? RemoveModifiers<`${Prefix}${Suffix}`>
            : T extends `${infer Prefix}-optional-boolean${infer Suffix}`
              ? RemoveModifiers<`${Prefix}${Suffix}`>
              : T extends `${infer Prefix}-number${infer Suffix}`
                ? RemoveModifiers<`${Prefix}${Suffix}`>
                : T extends `${infer Prefix}-string${infer Suffix}`
                  ? RemoveModifiers<`${Prefix}${Suffix}`>
                  : T extends `${infer Prefix}-boolean${infer Suffix}`
                    ? RemoveModifiers<`${Prefix}${Suffix}`>
                    : T extends `${infer Prefix}-optional${infer Suffix}`
                      ? RemoveModifiers<`${Prefix}${Suffix}`>
                      : T;

// Safely isolates structural delimiters
type StripToDelimiter<T extends string> = T extends `${infer Char}${infer Rest}`
  ? Char extends "/" | "-" | "}" | "&" | ";" | "."
    ? T
    : StripToDelimiter<Rest>
  : "";

type StripDefaults<T extends string> = T extends `${infer Prefix}?${infer Rest}`
  ? `${Prefix}${StripDefaults<StripToDelimiter<Rest>>}`
  : T;

type SplitQuery<
  T extends string,
  PathAcc extends string = "",
> = T extends `${infer Part}?${infer Rest}`
  ? Rest extends `${string}?${string}`
    ? SplitQuery<Rest, `${PathAcc}${Part}?`>
    : Rest extends `${string}}${string}`
      ? [`${PathAcc}${Part}?${Rest}`, ""]
      : [`${PathAcc}${Part}`, Rest]
  : [`${PathAcc}${T}`, ""];

type ScanClosing<
  T extends string,
  Depth extends 1[],
  Acc extends string = "",
> = T extends `${infer Char}${infer Rest}`
  ? Char extends "{"
    ? ScanClosing<Rest, [...Depth, 1], `${Acc}{`>
    : Char extends "}"
      ? Depth extends [1, ...infer RestDepth extends 1[]]
        ? RestDepth extends []
          ? [Acc, Rest]
          : ScanClosing<Rest, RestDepth, `${Acc}}`>
        : never
      : ScanClosing<Rest, Depth, `${Acc}${Char}`>
  : never;

type ExpandPaths<T extends string> = T extends `${infer Before}{${infer Rest}`
  ? ScanClosing<Rest, [1]> extends [
      infer Inside extends string,
      infer After extends string,
    ]
    ? | ExpandPaths<`${Before}${After}`>
      | ExpandPaths<`${Before}${Inside}${After}`>
    : T
  : T;

type ParseFlatParams<T extends string> = T extends `${string}:${infer Param}`
  ? Param extends `${infer P1}:${infer Rest}`
    ? [ParseModifiers<CleanParamString<P1>>, ...ParseFlatParams<`:${Rest}`>]
    : [ParseModifiers<CleanParamString<Param>>]
  : [];

type ParseQueryString<T extends string> = T extends `${infer K};${infer Rest}`
  ? [ParseModifiers<CleanParamString<K>>, ...ParseQueryString<Rest>]
  : T extends `${infer K}&${infer Rest}`
    ? [ParseModifiers<CleanParamString<K>>, ...ParseQueryString<Rest>]
    : T extends ""
      ? []
      : [ParseModifiers<CleanParamString<T>>];

type ParsedParam = { name: string; type: unknown; optional: boolean };

type ParamsToObj<T extends ParsedParam[]> = Simplify<
  {
    [
      K in T[number] as K extends { optional: false } ? K["name"] : never
    ]: K["type"];
  } & {
    [
      K in T[number] as K extends { optional: true } ? K["name"] : never
    ]?: K["type"];
  }
>;

type ParsedPathParams<T extends string> = T extends string
  ? ParamsToObj<ParseFlatParams<T>>
  : never;

type BuildBodyProp<Params, Query> =
  IsUnionEmpty<Params> extends true
    ? IsUnionEmpty<Query> extends true
      ? { requestInput: never }
      : { requestInput: { query: Query } }
    : IsUnionEmpty<Query> extends true
      ? { requestInput: { params: Params } }
      : { requestInput: { params: Params; query: Query } };

type BodyFinished = {
  requestInput: Record<"body" | "query" | "params", Record<string, never>>;
};

type FinalBody<B, Params, Query> = B extends null
  ? BuildBodyProp<Params, Query>
  : { requestInput: B };

export type GetUrlFetch<
  Url extends string,
  RequestInput,
  Extra extends Record<string, unknown> = Record<string, never>,
  Response = DEFAULT_RESPONSE,
> = Url extends unknown
  ? SplitQuery<Url> extends [
      infer Path extends string,
      infer QueryStr extends string,
    ]
    ? Simplify<
        {
          url: StripDefaults<RemoveModifiers<Path>>;
          response: Response;
        } & FinalBody<
          RequestInput,
          ParsedPathParams<ExpandPaths<Path>>,
          ParamsToObj<ParseQueryString<QueryStr>>
        > &
          Extra
      >
    : never
  : never;

export type GetRouterObj<T extends { url: string }, U extends string> = {
  handler: Handler;
} & (Extract<T, { url: U }> extends
  { auth: true } | { canBeUnavailableService: true }
  ? { middlewares: [Handler, ...Handler] }
  : { middlewares?: Handler[] });

type RouterFetch = Record<
  string,
  {
    url: string;
    response: unknown;
    requestInput: Partial<Record<"body" | "query" | "params", unknown>>;
  }
>;

export type GetBody<
  H extends RouterFetch,
  K extends keyof H = keyof H,
  U extends H[K]["url"] = H[K]["url"],
> = Extract<H[K], { url: U }>["requestInput"];

type GetRequest<M extends MethodsAPI, K> = M extends "POST" | "PUT"
  ? Request<unknown, unknown, K>
  : M extends "GET" | "DELETE"
    ? Request<K, unknown>
    : never;

type ExpandType<Original, JsType> = Original extends JsType ? Original : JsType;

type JsTypes<O> = O extends readonly (keyof TypeOfJS)[]
  ? TypeOfJS[O[number]]
  : O extends keyof TypeOfJS
    ? TypeOfJS[O]
    : never;

type MergeField<Original, O> = O extends FieldSelector
  ? Original extends unknown
    ? Original extends JsTypes<O>
      ? Original
      : never
    : never
  : never;

type FieldSelector = keyof TypeOfJS | readonly (keyof TypeOfJS)[];

type Selectors<T> = {
  [P in keyof T]?: FieldSelector;
};

type GetKeys<B> = {
  [P in keyof B]?: NonNullable<B[P]> extends object
    ? Selectors<NonNullable<B[P]>>
    : never;
};

type MergeSelectors<B, O> = {
  [P in keyof B]: P extends keyof O
    ? O[P] extends FieldSelector
      ? MergeField<B[P], O[P]>
      : B[P]
    : B[P];
};

type MergeNestedSelectors<B, O> = {
  [P in keyof B]: P extends keyof O
    ? O[P] extends object
      ? MergeSelectors<NonNullable<B[P]>, O[P]>
      : B[P]
    : B[P];
};

type MergeGetBody<B, O> = {
  [P in keyof B]: NonNullable<B[P]> extends object
    ? P extends keyof O
      ? O[P] extends object
        ? MergeNestedSelectors<B[P], O[P]>
        : B[P]
      : B[P]
    : B[P];
};

export type GetHandlerType<H extends RouterFetch, M extends MethodsAPI> = <
  K extends keyof H,
  U extends H[K]["url"],
  B extends GetBody<H, K, U>,
  O extends GetKeys<B>,
  T extends MergeGetBody<B, O>,
>(
  path: K,
  url: U,
  keys: [O] extends [Record<string, never> | undefined | null]
    ? Record<string, never>
    : O,
  callback: (
    requestInput: T,
    sendResponse: (
      status: STATUS_RESPONSE,
      message: Extract<H[K], { url: U }>["response"],
    ) => void,
    express: {
      res: Response<Extract<H[K], { url: U }>["response"]>;
      req: GetRequest<M, T>;
      next: NextFunction;
    },
  ) => unknown,
) => (req: Request, res: Response, next: NextFunction) => Promise;

export type DEFAULT_RESPONSE = {
  error?: string;
  success: boolean;
};

export type GetRouteData<
  M extends MethodsAPI,
  U extends keyof FetchAPI<M>,
  URL extends FetchAPI<M>[U]["url"],
> = Extract<FetchAPI<M>[U], { url: URL }>;
