import { getRouterPost } from "@/routes/common";
import { handleTranslate } from "./handlers";

export const routerLanguagesPost = getRouterPost("/languages", {
  "/translate": { handler: handleTranslate },
});
