import { getRouterPost } from "../../functions";
import { handleChangeImageFormat } from "./handlers";

export const routerPostImages = getRouterPost("/images", {
  "/change-format": { handler: handleChangeImageFormat },
});
