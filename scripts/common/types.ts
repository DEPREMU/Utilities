import { Function } from "@types";
import type { Script } from "../common";

export type StepFunctionType = Function<
  [instance: Script, abortController: AbortController],
  void | Promise<void>
>;

export type JsonPackageShape = {
  app: typeof import("../../app/package.json");
  root: typeof import("../../package.json");
  types: typeof import("../../types/package.json");
  server: typeof import("../../server/package.json");
  common: typeof import("../../common/package.json");
  frontend: typeof import("../../frontend/package.json");
  utilitiesForPC: typeof import("../../UtilitiesForPC/package.json");
};
