import { Get } from "./GetAPI";
import { Put } from "./PutAPI";
import { Post } from "./PostAPI";
import { Delete } from "./DeleteAPI";
import { CleanUrlParameters } from "@types";

export * from "./Request";
export * from "./Helpers";
export * from "./Response";
export * from "./typesAPI";
export * from "./typesUpdates";
export * from "./GetAPI";
export * from "./PutAPI";
export * from "./PostAPI";
export * from "./DeleteAPI";

export type MethodsAPI = "GET" | "PUT" | "POST" | "DELETE";

export type ResolveRoute<
  T,
  Route extends string,
  Prefix extends string = "",
> = {
  [K in keyof T]: T[K] extends infer V
    ? V extends { url: infer U extends string }
      ? Route extends `${Prefix}${K & string}${U}`
        ? V
        : never
      : V extends object
        ? ResolveRoute<V, Route, `${Prefix}${K & string}`>
        : never
    : never;
}[keyof T];

type GetRecursiveRoutes<T, Prefix extends string = ""> = {
  [K in keyof T]: T[K] extends { url: infer U }
    ? U extends string
      ? `${Prefix}${K & string}${U}`
      : never
    : T[K] extends object
      ? GetRecursiveRoutes<T[K], `${Prefix}${K & string}`>
      : never;
}[keyof T];

export type RoutesGetAPI = GetRecursiveRoutes<Get>;
export type RoutesPutAPI = GetRecursiveRoutes<Put>;
export type RoutesPostAPI = GetRecursiveRoutes<Post>;
export type RoutesDeleteAPI = GetRecursiveRoutes<Delete>;

declare global {
  export type RoutesAPI = {
    GET: RoutesGetAPI;
    PUT: RoutesPutAPI;
    POST: RoutesPostAPI;
    DELETE: RoutesDeleteAPI;
  };

  export type FetchAPI<T extends MethodsAPI> = {
    GET: Get;
    PUT: Put;
    POST: Post;
    DELETE: Delete;
  }[T];
}

type Response = {
  ok: boolean;
  status: number;
};

export type FetchToServerMethod<M extends MethodsAPI> = <
  const R extends RoutesAPI[M],
  B extends ResolveRoute<FetchAPI<M>, R>["body"],
>(
  route: R,
  ...args: B extends undefined
    ? ResolveRoute<FetchAPI<M>, R>["auth"] extends true
      ? [body: undefined, authToken: string]
      : []
    : [
        body: NonNullable<B>,
        ...args: ResolveRoute<FetchAPI<M>, R>["auth"] extends true
          ? [authToken: string]
          : [],
      ]
) => Promise<Response & { data: ResolveRoute<FetchAPI<M>, R>["response"] }>;

export type FetchToServer = <M extends MethodsAPI, const R extends RoutesAPI[M]>(
  method: M,
  route: R,
  ...args: B extends undefined
    ? ResolveRoute<FetchAPI<M>, R>["auth"] extends true
      ? [body: undefined, authToken: string]
      : []
    : [
        body: NonNullable<B>,
        ...args: ResolveRoute<FetchAPI<M>, R>["auth"] extends true
          ? [authToken: string]
          : [],
      ]
) => Promise<Response & { data: ResolveRoute<FetchAPI<M>, R>["response"] }>;

export type FetchToServerPerMethod = {
  GET: FetchToServerMethod<"GET">;
  PUT: FetchToServerMethod<"PUT">;
  POST: FetchToServerMethod<"POST">;
  DELETE: FetchToServerMethod<"DELETE">;
};
