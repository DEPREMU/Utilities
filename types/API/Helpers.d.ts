import {
  Get,
  Post,
  Delete,
  TypeOfJS,
  MethodsAPI,
  DEFAULT_RESPONSE,
} from "@types";
import type { STATUS_RESPONSE } from "@common";
import { Handler, NextFunction, Request, Response } from "express";

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

type ParamToObject<P extends string> =
  P extends `${infer Name}-${infer Type}-${infer Mods}`
    ? Mods extends `${string}optional${string}`
      ? {
          [K in Name]?: ApplyModifiers<
            BaseType<Type>,
            Exclude<Mods, "optional">
          >;
        }
      : { [K in Name]: ApplyModifiers<BaseType<Type>, Mods> }
    : P extends `${infer Name}-${infer Type}`
      ? { [K in Name]: BaseType<Type> }
      : { [K in P]: string };

export type GetParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? ParamToObject<Param> & GetParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? ParamToObject<Param>
      : {};

export type GetRouterObj = {
  handler: Handler;
  middlewares?: Handler[];
};

type RouterFetch = Record<string, GetUrlFetch<string, unknown, {}>>;

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
    response: Response;
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

export type GetHandlerType<H extends RouterFetch, M extends MethodsAPI> = <
  K extends keyof H,
  U extends H[K]["url"],
  B extends GetBody<M, H, K, U>,
  O extends { [P in keyof B]?: keyof TypeOfJS | (keyof TypeOfJS)[] },
  T extends {
    [P in keyof B]: O[P] extends (keyof TypeOfJS)[]
      ? TypeOfJS[O[P][number]]
      : O[P] extends keyof TypeOfJS
        ? TypeOfJS[O[P]]
        : B[P];
  },
>(
  path: K,
  url: U,
  keys: O,
  callback: (
    body: T,
    sendResponse: (
      status: keyof typeof STATUS_RESPONSE,
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
