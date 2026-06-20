import { Get } from "./GetAPI";
import { Post } from "./PostAPI";
import { Delete } from "./DeleteAPI";
import { CleanUrlParameters } from "@types";

export * from "./Request";
export * from "./Helpers";
export * from "./Response";
export * from "./typesAPI";
export * from "./typesUpdates";
export * from "./GetAPI";
export * from "./PostAPI";
export * from "./DeleteAPI";

export type MethodsAPI = "GET" | "PUT" | "POST" | "DELETE";

type ResolveRoute<T, Route extends string, Prefix extends string = ""> = {
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
export type RoutesPostAPI = GetRecursiveRoutes<Post>;
export type RoutesDeleteAPI = GetRecursiveRoutes<Delete>;

declare global {
  export type RoutesAPI = {
    GET: RoutesGetAPI;
    POST: RoutesPostAPI;
    DELETE: RoutesDeleteAPI;
  };

  export type FetchAPI<T extends MethodsAPI> = {
    GET: Get;
    POST: Post;
    DELETE: Delete;
  }[T];
}

export type FetchToServerMethod<M extends MethodsAPI> = <
  const R extends RoutesAPI[M],
>(
  route: R,
  body:  ResolveRoute<FetchAPI<M>, R>["body"] ,
) => Promise<ResolveRoute<FetchAPI<M>, R>["response"]>;

export type FetchToServer = <
  M extends MethodsAPI,
  const R extends RoutesAPI[M],
>(
  method: M,
  route: R,
  body: NonNullable<ResolveRoute<FetchAPI<M>, R>["body"]>,
) => Promise<ResolveRoute<FetchAPI<M>, R>["response"]>;

export type FetchToServerPerMethod = {
  GET: FetchToServerMethod<"GET">;
  PUT: FetchToServerMethod<"PUT">;
  POST: FetchToServerMethod<"POST">;
  DELETE: FetchToServerMethod<"DELETE">;
};
