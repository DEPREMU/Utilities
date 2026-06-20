import { getRouterPost } from "@/routes/common";
import { handleDecrypt, handleEncrypt } from "./handlers";

export const routerEncryptionPost = getRouterPost("/encryption", {
  "/decrypt": { handler: handleDecrypt },
  "/encrypt": { handler: handleEncrypt },
});
