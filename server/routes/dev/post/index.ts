import { getRouterPost } from "@common";
import { handleExecuteQuery } from "./handlers";

export const routerDevPost = getRouterPost("/dev", {
  "/executeQuery": { handler: handleExecuteQuery },
});
