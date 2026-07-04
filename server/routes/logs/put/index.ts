import { getRouterPut } from "@common";
import { handleUpdateLog } from "./handlers";

export const routerLogsPut = getRouterPut("/logs", {
  "/": { handler: handleUpdateLog },
});
