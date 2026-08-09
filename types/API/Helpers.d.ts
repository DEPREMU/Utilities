import {
  TypeOfJS,
  MethodsAPI,
  DEFAULT_RESPONSE,
  ResponseUnavailableService,
} from "@types";
import type { STATUS_RESPONSE } from "../../common/both";
import { Handler, NextFunction, Request, Response } from "express";

type RemoveOptional<M extends string> = M extends `${infer Rest}-optional`
  ? Rest
  : M extends `optional-${infer Rest}`
    ? Rest
    : M extends "optional"
      ? ""
      : M;

type BaseType<T extends string> = T extends "string"
  ? string
  : T extends "number"
    ? number
    : T extends "boolean"
      ? boolean
      : T extends "bigint"
        ? bigint
        : never;

type ApplyModifiers<
  T,
  Mods extends string,
> = Mods extends `${infer Mod}-${infer Rest}`
  ? ApplyModifiers<
      Mod extends "array" ? T[] : Mod extends "nullable" ? T | null : T,
      Rest
    >
  : Mods extends "array"
    ? T[]
    : Mods extends "nullable"
      ? T | null
      : T;

type StripOptional<P extends string> = P extends `${infer R}-optional`
  ? [R, true]
  : [P, false];

type ParamToObject<P extends string> =
  StripOptional<P> extends [
    infer Core extends string,
    infer IsOpt extends boolean,
  ]
    ? Core extends `${infer Name}-${infer Type}-${infer Mods}`
      ? IsOpt extends true
        ? { [K in Name]?: ApplyModifiers<BaseType<Type>, Mods> }
        : { [K in Name]: ApplyModifiers<BaseType<Type>, Mods> }
      : Core extends `${infer Name}-${infer Type}`
        ? IsOpt extends true
          ? { [K in Name]?: BaseType<Type> }
          : { [K in Name]: BaseType<Type> }
        : IsOpt extends true
          ? { [K in Core]?: string }
          : { [K in Core]: string }
    : never;

type GetParams<
  T extends string,
  Found extends boolean = false,
> = T extends `${string}:${infer Param}/${infer Rest}`
  ? ParamToObject<Param> & GetParams<`/${Rest}`, true>
  : T extends `${string}:${infer Param}`
    ? ParamToObject<Param>
    : Found extends true
      ? Record<string, never>
      : never;

export type GetRouterObj<T extends { url: string }, U extends string> = {
  handler: Handler;
} & (Extract<T, { url: U }> extends
  { auth: true } | { canBeUnavailableService: true }
  ? { middlewares: [Handler, ...Handler] }
  : { middlewares?: Handler[] });

type RouterFetch = Record<
  string,
  GetUrlFetch<string, unknown, Record<string, never>>
>;

export type RequestParams<
  H extends RouterFetch,
  K extends keyof H = keyof H,
  U extends H[K]["url"] = H[K]["url"],
> = GetParams<U>;

type SplitAtLastSlash<
  T extends string,
  Acc extends string = "",
> = T extends `${infer Head}/${infer Tail}`
  ? Tail extends `${string}/${string}`
    ? SplitAtLastSlash<Tail, `${Acc}${Head}/`>
    : [`${Acc}${Head}`, Tail]
  : [Acc, T];

type ExpandOptionalPath<T extends string> =
  SplitAtLastSlash<T> extends [
    infer Rest extends string,
    infer Last extends string,
  ]
    ? Last extends `${string}-optional`
      ? T | ExpandOptionalPath<Rest>
      : T
    : T;

export type GetUrlFetch<
  Url extends string,
  Body,
  Extra extends Record<string, unknown>,
  Response,
> = {
  [P in ExpandOptionalPath<Url>]: {
    url: P;
    body?: Body extends null ? GetParams<P> : Body;
    response: Extra extends { canBeUnavailableService: true }
      ? Response | ResponseUnavailableService
      : Response;
  } & Extra;
}[ExpandOptionalPath<Url>];

type CleanParam<T extends string> = T extends `${infer Name}-${string}`
  ? Name
  : T;

export type CleanUrlParameters<T extends string> =
  T extends `${infer Start}:${infer Param}/${infer Rest}`
    ? `${Start}:${CleanParam<Param>}/${CleanUrlParameters<Rest>}`
    : T extends `${infer Start}:${infer Param}`
      ? `${Start}:${CleanParam<Param>}`
      : T;

type GetRequest<M extends MethodsAPI, K> = M extends "POST" | "PUT"
  ? Request<unknown, unknown, K>
  : M extends "GET" | "DELETE"
    ? Request<K, unknown>
    : never;

type GetBody<
  M extends MethodsAPI,
  H extends RouterFetch,
  K extends keyof H,
  U extends H[K]["url"],
> = M extends "POST" | "PUT"
  ? Extract<H[K], { url: U }>["body"] extends infer Body
    ? Body extends undefined | null
      ? never
      : Body
    : never
  : GetParams<U>;

type ExpandType<Original, JsType> = Original extends JsType ? Original : JsType;

type JsTypes<O> = O extends readonly (keyof TypeOfJS)[]
  ? TypeOfJS[O[number]]
  : O extends keyof TypeOfJS
    ? TypeOfJS[O]
    : never;

export type MergeField<Original, O> =
  JsTypes<O> extends infer J
    ? J extends unknown
      ? Original extends J
        ? Original
        : J
      : never
    : never;

export type GetHandlerType<H extends RouterFetch, M extends MethodsAPI> = <
  K extends keyof H,
  U extends H[K]["url"],
  B extends GetBody<M, H, K, U>,
  O extends { [P in keyof B]?: keyof TypeOfJS | (keyof TypeOfJS)[] },
  T extends {
    [P in keyof B]: O[P] extends keyof TypeOfJS | readonly (keyof TypeOfJS)[]
      ? MergeField<B[P], O[P]>
      : B[P];
  },
>(
  path: K,
  url: U,
  keys: [O] extends [Record<string, never> | undefined | null]
    ? Record<string, never>
    : O,
  callback: (
    body: T,
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
) => (req: Request, res: Response, next: NextFunction) => Promise<void>;

export type DEFAULT_RESPONSE = {
  error?: string;
  success: boolean;
};

export type GetRouteData<
  M extends MethodsAPI,
  U extends keyof FetchAPI<M>,
  URL extends FetchAPI<M>[U]["url"],
> = Extract<FetchAPI<M>[U], { url: URL }>;
