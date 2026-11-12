import { getEnvValue } from "@/env";
import { getHandlerPost, RequestError, STATUS_RESPONSE } from "@common";

export const handleUploadMiddleware = getHandlerPost(
  "/downloads",
  "/upload",
  async (_0, _1, { req, next }) => {
    if (!req.headers?.authorization)
      throw new RequestError(
        STATUS_RESPONSE.UNAUTHORIZED,
        "Missing bearer token",
      );

    const [bearer, token] = req.headers.authorization.split(" ");

    if (bearer !== "Bearer")
      throw new RequestError(STATUS_RESPONSE.UNAUTHORIZED, "Not valid");

    if (!token)
      throw new RequestError(
        STATUS_RESPONSE.UNAUTHORIZED,
        "Missing bearer token",
      );

    if (token !== getEnvValue("UPLOAD_TOKEN"))
      throw new RequestError(STATUS_RESPONSE.FORBIDDEN, "Token is not valid");

    next();
  },
);
